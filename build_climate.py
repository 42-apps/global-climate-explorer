#!/usr/bin/env python3
"""Global Climate Explorer — data builder.

Reads WorldClim 2.1 monthly rasters (data/raw/worldclim/*.tif: tavg, tmin, tmax,
prec, vapr) and the GeoNames cities15000 list, and emits compact JS data:

  data/grid.js    window.GCE_GRID    — 1° land grid for the colour-wash
                                       (per cell: 12× tavg, RH, precip)
  data/cities.js  window.GCE_CITIES  — every city >100k pop
                                       (per city: 12× tavg, tmin, tmax, RH, precip)
  data/countries.js window.GCE_COUNTRIES — ISO2 → name + label centroid (from geojson)

Relative humidity is derived from WorldClim vapour pressure (vapr, kPa) and tavg
via Tetens: es = 0.6108·exp(17.27·T/(T+237.3)) kPa; RH = 100·vapr/es.
Run with the project venv: tools/venv/bin/python build_climate.py
"""
import os, re, json, math
import numpy as np
import rasterio

HERE = os.path.dirname(os.path.abspath(__file__))
WC = os.path.join(HERE, "data", "raw", "worldclim")
GEO = os.path.join(HERE, "data", "countries.geojson")
CITYTXT = os.path.join(HERE, "data", "raw", "cities15000.txt")
MONTHS = range(1, 13)
NAT_W, NAT_H = 2160, 1080            # WorldClim 10m grid
F = 6                                # 6 native cells per degree → 1° grid (360×180)

def es(T):                           # saturation vapour pressure, kPa
    return 0.6108 * np.exp(17.27 * T / (T + 237.3))

def load_var(var):
    """Return (12, H, W) float32 array with NaN for nodata."""
    out = np.empty((12, NAT_H, NAT_W), dtype=np.float32)
    for i, m in enumerate(MONTHS):
        with rasterio.open(os.path.join(WC, f"wc2.1_10m_{var}_{m:02d}.tif")) as ds:
            a = ds.read(1).astype(np.float32)
            nd = ds.nodata
        a[a <= -1e30] = np.nan
        if nd is not None:
            a[a == nd] = np.nan
        out[i] = a
    return out

print("reading WorldClim rasters …")
tavg = load_var("tavg"); prec = load_var("prec"); vapr = load_var("vapr")
tmin = load_var("tmin"); tmax = load_var("tmax")
rh = np.clip(100.0 * vapr / es(tavg), 0, 100)        # relative humidity %

# ---------------------------------------------------------------- city sampling
def sample(arr, lat, lon):
    col = min(NAT_W - 1, max(0, int((lon + 180.0) / 360.0 * NAT_W)))
    row = min(NAT_H - 1, max(0, int((90.0 - lat) / 180.0 * NAT_H)))
    return arr[:, row, col]          # length-12 vector

cities = []
with open(CITYTXT, encoding="utf-8") as f:
    for line in f:
        p = line.rstrip("\n").split("\t")
        if len(p) < 15:
            continue
        try:
            pop = int(p[14]); lat = float(p[4]); lon = float(p[5])
        except ValueError:
            continue
        if pop < 100000:
            continue
        ta = sample(tavg, lat, lon)
        if not np.isfinite(ta[0]):    # skip points with no climate (tiny islands off-grid)
            continue
        cities.append({
            "n": p[2], "iso": p[8], "lat": round(lat, 2), "lon": round(lon, 2), "pop": pop,
            "ta": [round(float(x), 1) for x in ta],
            "tmn": [round(float(x), 1) for x in sample(tmin, lat, lon)],
            "tmx": [round(float(x), 1) for x in sample(tmax, lat, lon)],
            "rh":  [int(round(float(x))) for x in sample(rh, lat, lon)],
            "pr":  [int(round(float(x))) for x in sample(prec, lat, lon)],
        })
cities.sort(key=lambda c: c["pop"], reverse=True)
print(f"cities >100k with climate: {len(cities)}")

# ---------------------------------------------------------------- 1° land grid
def block_mean(arr):
    """(12,H,W) → (12, H/F, W/F) ignoring NaN."""
    a = arr.reshape(12, NAT_H // F, F, NAT_W // F, F)
    with np.errstate(invalid="ignore"):
        return np.nanmean(a, axis=(2, 4))

gt = block_mean(tavg); gr = block_mean(rh); gp = block_mean(prec)
GH, GW = NAT_H // F, NAT_W // F        # 180 × 360
grid_lat, grid_lon = [], []
grid_ta = [[] for _ in range(12)]; grid_rh = [[] for _ in range(12)]; grid_pr = [[] for _ in range(12)]
for r in range(GH):
    lat = 90.0 - (r + 0.5) * (180.0 / GH)
    for c in range(GW):
        if not np.isfinite(gt[0, r, c]):
            continue                  # ocean / no land
        lon = -180.0 + (c + 0.5) * (360.0 / GW)
        grid_lat.append(round(lat, 1)); grid_lon.append(round(lon, 1))
        for m in range(12):
            grid_ta[m].append(int(round(float(gt[m, r, c]))))
            grid_rh[m].append(int(round(float(gr[m, r, c]))))
            grid_pr[m].append(int(round(float(gp[m, r, c]))))
print(f"land grid cells (1°): {len(grid_lat)}")

# ---------------------------------------------------------------- countries (from geojson)
countries = {}
with open(GEO, encoding="utf-8") as f:
    g = json.load(f)
for ft in g["features"]:
    pr = ft["properties"]
    iso = pr.get("ISO_A2_EH")
    if not iso or iso == "-99":
        iso = pr.get("ISO_A2")
    if not iso or iso == "-99":
        continue
    name = pr.get("ADMIN") or pr.get("NAME")
    lx, ly = pr.get("LABEL_X"), pr.get("LABEL_Y")
    countries[iso] = {"n": name, "lat": round(ly, 2) if ly is not None else None,
                      "lon": round(lx, 2) if lx is not None else None}

# ---------------------------------------------------------------- comfort (validation only; app recomputes live)
def dewpoint(t, rhv):
    a, b = 17.27, 237.7
    gam = math.log(max(rhv, 1) / 100.0) + a * t / (b + t)
    return b * gam / (a - gam)
def temp_s(ta, tmn=None, tmx=None):
    s = 1 - ((21 - ta) / 13.0) ** 2 if ta <= 21 else 1 - ((ta - 21) / 12.0) ** 2
    s = max(0.0, s)
    if tmx is not None and tmx > 32: s *= max(0.0, 1 - (tmx - 32) / 10.0)
    if tmn is not None and tmn < 0:  s *= max(0.2, 1 + tmn / 15.0)
    if tmn is not None and tmn >= 24: s *= 0.75
    return max(0.0, min(1.0, s))
def humid_s(td):
    return 1.0 if td < 13 else (0.0 if td >= 24 else 1 - (td - 13) / 11.0)
def rain_s(pr):
    return (0.5 + 0.5 * pr / 50.0) if pr <= 50 else max(0.0, 1 - (pr - 50) / 250.0)
def comfort(ta, rhv, pr, tmn=None, tmx=None):
    td = dewpoint(ta, rhv)
    return 100 * (0.5 * temp_s(ta, tmn, tmx) + 0.3 * humid_s(td) + 0.2 * rain_s(pr))
def annual(c):
    return sum(comfort(c["ta"][m], c["rh"][m], c["pr"][m], c["tmn"][m], c["tmx"][m]) for m in range(12)) / 12

# ---------------------------------------------------------------- emit
def compact(o): return json.dumps(o, separators=(",", ":"), ensure_ascii=False)
os.makedirs(os.path.join(HERE, "data"), exist_ok=True)

with open(os.path.join(HERE, "data", "grid.js"), "w", encoding="utf-8") as f:
    f.write("/* Global Climate Explorer — 1° land grid for the colour-wash (WorldClim 2.1). */\n")
    f.write("window.GCE_GRID=" + compact({
        "res": 1.0, "n": len(grid_lat), "lat": grid_lat, "lon": grid_lon,
        "ta": grid_ta, "rh": grid_rh, "pr": grid_pr}) + ";\n")

with open(os.path.join(HERE, "data", "cities.js"), "w", encoding="utf-8") as f:
    f.write("/* Global Climate Explorer — cities >100k, monthly climate (WorldClim 2.1). */\n")
    f.write("window.GCE_CITIES=[\n")
    for c in cities:
        f.write(compact(c) + ",\n")
    f.write("];\n")

with open(os.path.join(HERE, "data", "countries.js"), "w", encoding="utf-8") as f:
    f.write("/* Global Climate Explorer — country names + label centroids (Natural Earth). */\n")
    f.write("window.GCE_COUNTRIES=" + compact(countries) + ";\n")

# ---------------------------------------------------------------- console validation
print(f"\nemitted grid.js ({len(grid_lat)} cells), cities.js ({len(cities)}), countries.js ({len(countries)})")
print("\nTop 12 cities by ANNUAL comfort:")
for c in sorted(cities, key=annual, reverse=True)[:12]:
    print(f"  {c['n']:<22} {c['iso']}  {annual(c):4.0f}")
jan = lambda c: comfort(c["ta"][0], c["rh"][0], c["pr"][0], c["tmn"][0], c["tmx"][0])
jul = lambda c: comfort(c["ta"][6], c["rh"][6], c["pr"][6], c["tmn"][6], c["tmx"][6])
print("\nBest places to visit in JANUARY (top 10):")
for c in sorted(cities, key=jan, reverse=True)[:10]:
    print(f"  {c['n']:<22} {c['iso']}  Jan {jan(c):4.0f}")
print("\nBest places to visit in JULY (top 10):")
for c in sorted(cities, key=jul, reverse=True)[:10]:
    print(f"  {c['n']:<22} {c['iso']}  Jul {jul(c):4.0f}")

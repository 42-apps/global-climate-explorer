# Global Climate Explorer — Data Source Research

Research date: 2026-06-17. Goal: build a world map (colour-wash) + city/country ranking of
**monthly climate normals** — min/max/avg temperature, relative humidity, rainfall.
Constraints: build machine has **Python (stdlib + a venv that may have numpy/rasterio)** and
**curl**, **no API keys**. Everything below is free and key-free.

---

## TL;DR RECOMMENDATION

- **(a) Best global map grid:** **WorldClim 2.1 at 10 arc-minutes** (`tmin`, `tmax`, `tavg`,
  `prec`, `vapr`). Tiny — 5 files total ~141 MB zipped. Bump to **5m** (~473 MB) if you want
  sharper coastlines. 30s (1 km) is multi-GB per variable — avoid unless you tile.
- **(b) Best per-city normals:** **Open-Meteo Historical (ERA5) Archive API**, free, no key,
  aggregate daily data 1991–2020 to monthly means client-side. Fallback/cross-check:
  **Meteostat bulk normals** CSVs (station-based; no humidity).
- **(c) Humidity:** Two paths. **Map:** derive RH from WorldClim `vapr` (actual vapour
  pressure, kPa) ÷ saturation vapour pressure at `tavg` (Tetens). **Per-city:** Open-Meteo
  exposes `relative_humidity_2m` directly (hourly only → average to monthly).
- **WorldClim 10m/5m is absolutely small enough** to download & process with rasterio (or even
  pure-numpy on the raw GeoTIFFs). 10m = ~141 MB; 5m = ~473 MB for the 5 variables we need.

---

# 1. GRIDDED CLIMATE NORMALS (global colour-wash map)

## 1.1 WorldClim 2.1 — PRIMARY CHOICE

- **Period:** 1970–2000 climate normals.
- **Source page:** https://www.worldclim.org/data/worldclim21.html
- **Format:** ZIP archive per variable, each containing **12 GeoTIFF (.tif) files**, one per month
  (filenames like `wc2.1_10m_tmin_01.tif` … `_12.tif`). GeoTIFF is directly readable by rasterio /
  GDAL; the grid is plain WGS84 lat/lon, global land only (oceans = NoData).
- **License:** Free for academic and other non-commercial use; redistribution allowed with
  attribution. **Cite:** Fick, S.E. and R.J. Hijmans (2017), *WorldClim 2: new 1-km spatial
  resolution climate surfaces for global land areas*, International Journal of Climatology 37(12):
  4302–4315.

### Monthly variables (each = 12 monthly GeoTIFFs)

| var    | meaning                       | unit            |
|--------|-------------------------------|-----------------|
| `tmin` | min temperature               | °C              |
| `tmax` | max temperature               | °C              |
| `tavg` | average temperature           | °C              |
| `prec` | precipitation (rainfall)      | mm              |
| `srad` | solar radiation               | kJ m⁻² day⁻¹    |
| `wind` | wind speed                    | m s⁻¹           |
| `vapr` | **water vapour pressure**     | **kPa**         |

Also: `bio` = 19 derived bioclim variables; `elev` = elevation (single GeoTIFF).
**For this app we only need `tmin`, `tmax`, `tavg`, `prec`, `vapr`.**

> Note on units: in WorldClim **2.1** GeoTIFFs the values are stored already in physical units
> (°C, mm, kPa) as 32-bit floats — **no ÷10 scaling** (that ÷10 integer scaling was WorldClim
> **1.4** `.bil`, see https://www.worldclim.org/data/v1.4/formats.html). NoData is a large negative
> float (e.g. −3.4e38); mask it before colour-mapping.

### Resolutions, download URLs, and exact file sizes

Base URL pattern (direct, key-free, curl-able):
```
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_<RES>_<VAR>.zip
```
where `<RES>` ∈ {`10m`, `5m`, `2.5m`, `30s`} and `<VAR>` ∈ {tmin,tmax,tavg,prec,srad,wind,vapr,bio,elev}.
Directory index: https://geodata.ucdavis.edu/climate/worldclim/2_1/base/

Approx pixel size at equator: **10m ≈ 18.5 km, 5m ≈ 9.2 km, 2.5m ≈ 4.6 km, 30s ≈ 1 km.**

Exact zip sizes from the server directory listing:

| variable | 10m  | 5m    | 2.5m  | 30s    |
|----------|------|-------|-------|--------|
| tmin     | 36M  | 123M  | 430M  | 4.1G   |
| tmax     | 36M  | 121M  | 424M  | 4.1G   |
| tavg     | 36M  | 121M  | 423M  | 4.0G   |
| prec     | 6.9M | 22M   | 68M   | 1.0G   |
| vapr     | 26M  | 86M   | 250M  | 1.2G   |
| srad     | 15M  | 57M   | 212M  | 2.6G   |
| wind     | 27M  | 82M   | 211M  | 741M   |
| bio      | 48M  | 171M  | 628M  | 9.7G   |
| elev     | 1.3M | 4.6M  | 17M   | 323M   |

**Download size for our 5 needed variables (tmin+tmax+tavg+prec+vapr):**
- **10m ≈ 141 MB** ✅ trivial
- **5m ≈ 473 MB** ✅ easy
- 2.5m ≈ 1.6 GB (fine if disk allows)
- 30s ≈ 14.5 GB ❌ only if you really need 1 km and can tile/stream

**Exact URLs for the 10m recommended set:**
```
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tmin.zip
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tmax.zip
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tavg.zip
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_prec.zip
https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_vapr.zip
```
(swap `10m`→`5m` for the higher-res set.)

### Deriving RELATIVE HUMIDITY from WorldClim `vapr`

WorldClim gives **actual** water vapour pressure (`vapr`, kPa) but not RH. RH = actual ÷ saturation
vapour pressure at the air temperature, ×100. Use monthly `tavg` for the temperature.

Saturation vapour pressure **eₛ** (kPa) via **Tetens** (FAO-56 form):
```
es(T) = 0.6108 * exp( (17.27 * T) / (T + 237.3) )      # T in °C, es in kPa
```
Then:
```
RH(%) = 100 * vapr / es(tavg)        # clamp to [0, 100]
```
Tetens is accurate to ~1 Pa up to 35 °C — plenty for a normals map. (For sub-zero months over ice
you may prefer the over-ice coefficients 21.875 / 265.5, but the liquid-water form above is the
standard and fine for a global wash.) Sources:
- Tetens equation: https://en.wikipedia.org/wiki/Tetens_equation
- FAO-56 / Snyder humidity conversion: https://biomet.ucdavis.edu/doc/humidity_conversion.pdf
- VPD/dewpoint derivation (Oregon State): https://andrewsforest.oregonstate.edu/data/studies/ms01/dewpt_vpd_calculations.pdf

Python (numpy) snippet:
```python
import numpy as np
def rh_from_vapr(vapr_kpa, tavg_c):
    es = 0.6108 * np.exp((17.27 * tavg_c) / (tavg_c + 237.3))  # kPa
    rh = 100.0 * vapr_kpa / es
    return np.clip(rh, 0, 100)
```

## 1.2 Alternatives to WorldClim

### CHELSA V2.1 (higher quality in mountains/tropics)
- **Period:** 1981–2010 climatologies. **Resolution:** 30 arc-sec (~1 km), GeoTIFF.
- Variables: `tas`/`tasmin`/`tasmax` (monthly mean/min/max temp), `pr` (precip), plus bioclim, `vpd`,
  `hurs` (**near-surface relative humidity, monthly — directly provided!**), `rsds`, `sfcWind`.
- DOI / landing: https://www.doi.org/10.16904/envidat.228 ;
  EnviDat dataset: https://www.envidat.ch/dataset/2adb0c83-4653-4337-af28-f75c63ab7c74 ;
  metadata: https://www.envidat.ch/metadata/chelsa-climatologies
- Files are on the GLOWA/W-Slr server; canonical tree:
  `https://os.zhdk.cloud.switch.ch/chelsav2/GLOBAL/climatologies/1981-2010/<var>/CHELSA_<var>_<mm>_1981-2010_V.2.1.tif`
  (e.g. `.../tas/CHELSA_tas_01_1981-2010_V.2.1.tif`). A file list / envidat.ch tree gives exact names.
- License: CC0 1.0 (public domain). **Note:** 30s only → each monthly global GeoTIFF is large; this
  is the upgrade path if WorldClim resolution isn't enough, and it gives **`hurs` humidity for free**.

### TerraClimate (monthly time series + 30-yr normals, water-balance vars)
- ~4 km (1/24°), monthly, 1958–present; also distributed as **30-yr climatological monthly summaries**.
- Variables include `tmin`, `tmax`, `ppt` (precip), `vap` (vapour pressure), `srad`, `ws`, plus PET,
  soil moisture, runoff, PDSI. NetCDF (compressed). Needs `netCDF4`/xarray (rasterio won't read it).
- Variables page: https://www.climatologylab.org/terraclimate-variables.html
- Direct downloads (per-year NetCDF + climatology): https://climate.northwestknowledge.net/TERRACLIMATE/
  and direct-download index https://climate.northwestknowledge.net/TERRACLIMATE/index_directDownloads.php
- License: public/open (cite Abatzoglou et al. 2018, Sci Data 5:170191).

### ERA5 / Copernicus (reanalysis, the source behind Open-Meteo)
- 0.25° (~28 km) global incl. ocean, hourly 1940–present; monthly-means product also exists.
- Native access (CDS API) **requires a free account/key** → against our "no key" constraint. Use
  **Open-Meteo** (section 2) as the key-free door to ERA5 instead. Reference:
  https://cds.climate.copernicus.eu/ . License: Copernicus (free, attribution).

### Köppen–Geiger climate classification raster (categorical overlay, Beck et al.)
- Great as a **discrete climate-zone overlay/legend** layer (Af, BWh, Cfb, …), not for continuous T/RH.
- GeoTIFF, uint8 class codes, multiple resolutions incl. 1 km.
- Beck et al. 2018 (present 1980–2016 + future), figshare:
  https://figshare.com/articles/dataset/Present_and_future_K_ppen-Geiger_climate_classification_maps_at_1-km_resolution/6396959
- Beck et al. 2023 (1901–2099, 1 km, constrained CMIP6), figshare:
  https://figshare.com/articles/dataset/High-resolution_1_km_K_ppen-Geiger_maps_for_1901_2099_based_on_constrained_CMIP6_projections/21789074
- Paper: https://www.nature.com/articles/sdata2018214 . License: CC BY 4.0.

---

# 2. PER-CITY MONTHLY NORMALS via API (fallback if no raster tooling)

## 2.1 Open-Meteo Historical (ERA5) Archive API — PRIMARY per-city source

- **Free, no API key**, JSON over HTTPS GET (curl-friendly). Data = ERA5 reanalysis, ~9–25 km, global,
  no missing data, 1940–present (≈5-day lag near present; historical is stable).
- **Base endpoint:** `https://archive-api.open-meteo.com/v1/archive`
- Docs: https://open-meteo.com/en/docs/historical-weather-api
- **License:** CC BY 4.0 (attribute "Weather data by Open-Meteo.com"). No key for non-commercial.
- **Rate limits (free tier):** **600 calls/min, 5,000 calls/hour, 10,000 calls/day** (≈300k/month).
  → For ~1,000–3,000 cities, **one call per city** for a 30-year daily pull is the right granularity;
  stay under the hourly cap by batching (e.g. ~80 cities/min with a small sleep) and you finish a
  3,000-city run inside the daily budget with room to spare. Cache every JSON response to disk.
  Terms: https://open-meteo.com/en/terms

### Which variables, and daily vs hourly

**Daily aggregates** (set `daily=`) — gives temperature + rainfall directly:
- `temperature_2m_mean`, `temperature_2m_max`, `temperature_2m_min` (°C)
- `precipitation_sum` (mm), `rain_sum` (mm), `snowfall_sum` (cm)
- `precipitation_hours` (count of hours with precip that day)
- also available: `shortwave_radiation_sum`, `wind_speed_10m_max`, `et0_fao_evapotranspiration`,
  `apparent_temperature_*`, `sunshine_duration`, etc.

**Relative humidity:** `relative_humidity_2m` is **HOURLY ONLY** — there is **no
`relative_humidity_2m` daily aggregate**. To get monthly RH normals, request it as an **hourly**
variable and average. (Same is true for `dew_point_2m`.) So:
- Temperature + rainfall + precip-hours → request via `daily=` (cheap, 1 row/day).
- Humidity → request via `hourly=relative_humidity_2m` (24 rows/day) and mean it.

> Tip to keep payloads small: do **two passes** per city, or one combined call. A combined daily+hourly
> call over 1991–2020 returns ~10,950 daily rows + ~262,800 hourly RH values — sizeable but fine if you
> stream to disk. If bandwidth matters, you can pull humidity at lower fidelity (e.g. a few
> representative years) or accept daily-only temp/rain and use WorldClim-derived RH for the map.

### Monthly endpoint?

Open-Meteo's Archive API has **no monthly-normals endpoint** — you aggregate yourself. (Open-Meteo's
separate **Climate API**, https://open-meteo.com/en/docs/climate-api , serves *downscaled CMIP6 model*
data 1950–2050, not observational normals — not what we want for "current climate".)

### Aggregating daily → monthly 30-year normals (1991–2020)

For each city:
1. Pull daily series `start_date=1991-01-01&end_date=2020-12-31`.
2. Group by calendar month (1–12) across all 30 years.
3. Monthly normal =
   - **tmin/tmax/tavg:** mean of daily min/max/mean within that month-of-year.
   - **rainfall:** mean of the **monthly totals** (sum each Jan, then average the 30 Jan totals) — *not*
     the mean of daily values. Same for `precipitation_hours` (sum per month then average).
   - **RH:** mean of all hourly `relative_humidity_2m` values falling in that month-of-year.

### Working example URLs (copy-paste / curl)

Daily temp + rain + precip-hours, full 1991–2020, Tokyo:
```
https://archive-api.open-meteo.com/v1/archive?latitude=35.6895&longitude=139.6917&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours&timezone=auto
```
Hourly relative humidity (for monthly RH), Tokyo:
```
https://archive-api.open-meteo.com/v1/archive?latitude=35.6895&longitude=139.6917&start_date=1991-01-01&end_date=2020-12-31&hourly=relative_humidity_2m&timezone=auto
```
Combined (everything in one call), Berlin short window sanity-check:
```
https://archive-api.open-meteo.com/v1/archive?latitude=52.52&longitude=13.41&start_date=2022-07-01&end_date=2022-07-31&hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe/Berlin
```
Required params: `latitude`, `longitude`, `start_date`, `end_date`, and `daily=` and/or `hourly=`.
**`timezone` is required when using `daily=`** (use `timezone=auto` to anchor day boundaries to local
time). Add `&temperature_unit=celsius&precipitation_unit=mm` to be explicit. JSON returns parallel
arrays under `daily{}` / `hourly{}`.

## 2.2 Meteostat bulk (station observations) — secondary / cross-check

- **Base:** `https://bulk.meteostat.net/` . Free, no key. Station-based (gaps where stations are sparse).
- Docs: https://dev.meteostat.net/bulk/ , normals https://dev.meteostat.net/bulk/normals.html ,
  stations https://dev.meteostat.net/bulk/stations.html , formats https://dev.meteostat.net/formats.html
- **License:** CC BY-NC 4.0 (non-commercial, attribution; data under-the-hood from NOAA/DWD/etc.).

### Stations list
- Full metadata dump (id, name, country, region, lat, lon, elevation, timezone, WMO/ICAO ids, history):
  `https://bulk.meteostat.net/v2/stations/full.json.gz`
  (lite version `.../stations/lite.json.gz`). This maps Meteostat station IDs → coordinates so you can
  attach a nearest station to each city.

### Climate normals (per station)
- **URL format:** `https://bulk.meteostat.net/v2/normals/{station}.csv.gz`  (e.g. `.../normals/10637.csv.gz`)
- Gzipped CSV, comma-separated. One file per station, **all available 30-yr reference periods** stacked
  (e.g. 1961–1990, 1991–2020).
- **Columns (in order):** `start, end, month, tmin, tmax, prcp, wspd, pres, tsun`
  - start/end = reference-period years; month 1–12
  - `tmin`,`tmax` = avg daily min/max temp (°C); `prcp` = monthly precip total (mm)
  - `wspd` = avg wind speed (km/h); `pres` = avg sea-level pressure (hPa); `tsun` = sunshine (the bulk
    file stores sunshine in **minutes**)
- **Humidity: NOT included** in Meteostat normals (no `rhum` column in the normals product). Meteostat's
  *hourly* product has `rhum`, but normals/monthly do not. → For city humidity, use Open-Meteo, or derive
  from the WorldClim/CHELSA grid at the city's lat/lon.

### Monthly (per station, per year — if you'd rather roll your own normals)
- `https://bulk.meteostat.net/v2/monthly/{station}.csv.gz`
- Columns: `year, month, tavg, tmin, tmax, prcp, wspd, pres, tsun` (still no humidity).

---

# 3. WORLD CITIES LIST (lat/lon + population + country)

## 3.1 GeoNames cities dumps — RECOMMENDED (open, granular, free)

- Base dir: `https://download.geonames.org/export/dump/` (mirror of download.geonames.org)
- **License:** CC BY 4.0. Format: **tab-delimited UTF-8 text** inside each ZIP (one `.txt` of same name).
- **Files (population threshold / approx record count):**
  - `cities500.zip`  — pop > 500 (or seats down to PPLA4) — ~200k rows
  - `cities1000.zip` — pop > 1000 — ~150k rows
  - `cities5000.zip` — pop > 5000 — ~55k rows
  - `cities15000.zip` — pop > 15000 (and capitals) — ~28k rows  ← **good starting universe**
  Direct: `https://download.geonames.org/export/dump/cities15000.zip` (etc.). Zips are small (cities15000
  is a few MB).
- **Columns (19, tab-separated, no header):**
  `geonameid, name, asciiname, alternatenames, latitude, longitude, feature_class, feature_code,
  country_code, cc2, admin1_code, admin2_code, admin3_code, admin4_code, population, elevation, dem,
  timezone, modification_date`
  → we need `asciiname` (name), `latitude`, `longitude`, `country_code`, `population`.
- Readme (column spec): https://download.geonames.org/export/dump/readme.txt
- To resolve `country_code` → country name, also grab
  `https://download.geonames.org/export/dump/countryInfo.txt` (ISO code → name, continent, capital).

## 3.2 SimpleMaps World Cities (Basic) — easy alternative (single clean CSV)

- Product page (has the download button): https://simplemaps.com/data/world-cities
- **Basic (free) version:** single CSV, **~48k cities**, **CC BY 4.0** (attribute simplemaps.com).
- Download is a versioned zip served from `https://simplemaps.com/static/data/world-cities/basic/...`
  (filename carries the current version, e.g. `simplemaps_worldcities_basicv1.xx.zip`) — grab the exact
  link from the page's download button (it 403s to bots if you guess the version). The unzipped file is
  `worldcities.csv`.
- **Columns (Basic):** `city, city_ascii, lat, lng, country, iso2, iso3, admin_name, capital,
  population, id`
  → ready-made: city name, lat, lng, country **name** (no code lookup needed), population, capital flag.
- License text: https://simplemaps.com/data/license

> Practical pick: **SimpleMaps Basic** is the least-effort (clean CSV, real country names, lat/lng,
> population in one file). **GeoNames cities15000** is the more "open data" choice and lets you tune the
> population cut precisely. Either works.

## 3.3 Selecting ~1,000–3,000 globally-representative cities

Start from cities15000 (GeoNames) or SimpleMaps Basic, then:

1. **Drop rows with missing/zero population or coords.**
2. **Always include every country's capital + largest city** (guarantees country coverage incl. small
   nations). Capital flag is in SimpleMaps (`capital`) / via `countryInfo.txt` for GeoNames.
3. **Per-country quota by population**, e.g. take the top *k* cities per country where *k* scales with
   country population (cap so huge countries don't dominate: e.g. min 1, max ~30 per country). This
   yields good spread across continents.
4. **Climate-spread top-up:** to make sure deserts, poles, tropics, and high-altitude cities aren't
   under-sampled, bucket candidate cities by latitude band (e.g. 15° bands) and by Köppen zone (sample
   the WorldClim/Köppen grid at each city) and ensure each non-empty bucket has representation before
   trimming to the final 1,000–3,000.
5. **De-dupe near-duplicates** (cities within ~25 km of an already-selected, larger city) to avoid
   clustering around metros.

Result: a balanced set where the ranking is meaningful globally rather than skewed to dense regions.
For each selected city store: `name, country, lat, lon, population` → then attach monthly normals by
either (a) sampling the WorldClim/CHELSA rasters at (lat, lon), or (b) calling Open-Meteo per city.

---

## Sources

- WorldClim 2.1: https://www.worldclim.org/data/worldclim21.html ;
  directory https://geodata.ucdavis.edu/climate/worldclim/2_1/base/ ;
  v1.4 formats/units https://www.worldclim.org/data/v1.4/formats.html
- Tetens / RH: https://en.wikipedia.org/wiki/Tetens_equation ;
  https://biomet.ucdavis.edu/doc/humidity_conversion.pdf ;
  https://andrewsforest.oregonstate.edu/data/studies/ms01/dewpt_vpd_calculations.pdf
- CHELSA: https://www.envidat.ch/metadata/chelsa-climatologies ;
  https://www.envidat.ch/dataset/2adb0c83-4653-4337-af28-f75c63ab7c74
- TerraClimate: https://www.climatologylab.org/terraclimate-variables.html ;
  https://climate.northwestknowledge.net/TERRACLIMATE/
- Köppen-Geiger: https://www.nature.com/articles/sdata2018214 ;
  https://figshare.com/articles/dataset/Present_and_future_K_ppen-Geiger_climate_classification_maps_at_1-km_resolution/6396959
- ERA5/Copernicus CDS: https://cds.climate.copernicus.eu/
- Open-Meteo Historical API: https://open-meteo.com/en/docs/historical-weather-api ;
  terms/limits https://open-meteo.com/en/terms
- Meteostat bulk: https://dev.meteostat.net/bulk/ ;
  normals https://dev.meteostat.net/bulk/normals.html ;
  stations https://dev.meteostat.net/bulk/stations.html ;
  formats https://dev.meteostat.net/formats.html
- GeoNames: https://download.geonames.org/export/dump/ ;
  readme https://download.geonames.org/export/dump/readme.txt
- SimpleMaps World Cities: https://simplemaps.com/data/world-cities ;
  license https://simplemaps.com/data/license

# Global Climate Explorer 🌦️

**The world's climate, month by month — find the most comfortable places on Earth.**

An interactive 3D globe that paints the climate of every point on the planet —
**blue** where it's cold, **green** where it's most comfortable, **yellow** for warm,
**red** where it's too hot — for **any month of the year**. Drag the timeline to find
the best places to be in January, July, or any month; switch to temperature, humidity
or rainfall; or set your own ideal climate and watch the map and rankings rebuild.
Part of the [42-apps](https://42-apps.github.io/) collection, built with
[globe.gl](https://globe.gl).

**Live:** https://42-apps.github.io/global-climate-explorer/  ·  **v0.1.0**

## What it does

- **A living climate wash** over the whole Earth (globe + flat map), from WorldClim
  monthly normals — recoloured live for the month and layer you choose.
- **Four lenses:** ⭐ **Comfort** (evidence-based), 🌡️ **Temperature**, 💧 **Humidity**,
  🌧️ **Rainfall** — each with its own colour scale and ranking.
- **Month timeline (Jan → Dec)** with a ▶ to play the year, plus **Year-round** for the
  best all-year climates. "Where's perfect in January?" is one drag away.
- **Ranked by city *and* country** — ~6,000 cities and every country, scored for the
  current month and lens. Country score = population-weighted comfort of its cities.
- **Set your own ideal climate** — presets (🏖️ Beach · 🍃 Cool · ⛷️ Ski · 🌧️ Lush ·
  🏜️ Hot & dry) or sliders (ideal temperature, tolerance, how much humidity matters,
  prefer dry↔wet). The autopilot is evidence-based; the override is yours.
- **City profiles** — a 12-month climate strip (daily low→high, rainfall, comfort) and
  your best & worst months. A sortable **table** of every city × every month.
- Search, deep-linking (`?layer=temp`, `?m=7`, `?preset=ski`), and a responsive layout.

## The comfort model (autopilot)

Each place scores **0–100** per month, anchored to the thermal-comfort & temperature-
mortality literature:

- **Temperature (50%)** — peaks at your ideal (default ~**21 °C**, the human comfort and
  lowest-mortality optimum), falling off either side, with extra penalty for scorching
  days (max > 35 °C) and brutal nights.
- **Humidity (30%)** — by **dew point**: comfortable below 13 °C, oppressive above ~21 °C.
- **Rainfall (20%)** — favouring a moderate sweet-spot.

Change the **preferences** to move the ideal, chase the cold to ski, or prefer the rain —
the score, the colours and the rankings all rebuild around you.

## Data & method

- **Climate:** [WorldClim 2.1](https://worldclim.org/) monthly normals, 1970–2000, at
  10 arc-minute (~18 km) resolution — `tavg`, `tmin`, `tmax`, `prec`, and `vapr` (vapour
  pressure). Relative humidity is derived from `vapr` via Tetens
  (`es = 0.6108·exp(17.27·T/(T+237.3))`, `RH = 100·vapr/es`). CC BY 4.0.
- **Cities:** [GeoNames](https://www.geonames.org/) `cities15000`, filtered to population
  ≥ 100,000 (~6,100 cities), sampled against the WorldClim grid. CC BY 4.0.
- A 1° land grid drives the continuous colour-wash; cities drive the rankings & profiles.

These are *typical* (1970–2000) climate normals — a picture of the climate, not a
forecast, and predating the most recent warming. Comfort is one defensible model among
many; corrections and better ideas are warmly welcome.

## Run it

Static site — no build step:

```bash
python3 -m http.server 8772 --directory global-climate-explorer
# open http://localhost:8772
```

## Rebuild the data

Needs Python with `numpy` + `rasterio` (see `tools/venv`). Download the WorldClim 2.1 10m
rasters (`tavg/tmin/tmax/prec/vapr`) into `data/raw/worldclim/` and GeoNames
`cities15000.txt` into `data/raw/`, then:

```bash
tools/venv/bin/python build_climate.py   # → data/grid.js, data/cities.js, data/countries.js
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup & overlays |
| `app.css` | Styling (deep-ocean climate theme) |
| `app.js` | Globe wash, comfort model, layers, month timeline, rankings, profiles, table |
| `data/grid.js` | 1° land climate grid (the colour-wash) |
| `data/cities.js` | ~6,000 cities · 12-month climate |
| `data/countries.js` | Country names + label centroids |
| `build_climate.py` | Rebuilds the data from WorldClim + GeoNames |
| `data/raw/research-*.md` | The prior-art, comfort-science & data-source research |
| `lib/globe.gl.min.js` | 3D globe engine |

Climate © WorldClim 2.1 (CC BY 4.0) · cities © GeoNames (CC BY 4.0).

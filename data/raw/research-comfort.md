# Comfort & Health Climate Research — Global Climate Explorer

Research compiled 2026-06-17 for the "Global Climate Explorer" web app (rank the world's most comfortable & healthy climates by month, for cities AND countries). Two parts: (1) prior art, (2) the science of a comfortable & healthy human climate with concrete, encodable numeric thresholds.

---

## PART 1 — PRIOR ART

### Summary table

| Project / tool | What it does | Scope | By month? | Cities & countries? | Data source | URL |
|---|---|---|---|---|---|---|
| Kelly Norton, "Pleasant Places to Live" (2014) | Counts "pleasant days/yr" per place; choropleth dot map | **US only** | No (annual count) | Cities/stations only | NOAA Global Summary of the Day, 23 yrs | kellegous.com |
| taraskaduk replication (2019) | Re-creates & extends Norton's pleasant-day map | US only | Partial (best/worst per place) | Stations | NOAA GSOD | taraskaduk.com |
| Sperling's BestPlaces "Comfort Index" | 0–100 comfort score from temp + dew point + precip | **US only** | Seasonal (Summer Comfort Index) | Cities/metros | NOAA climate normals | bestplaces.net |
| WeatherSpark | "Tourism score" & "beach/pool score" per week; typical-weather reports | **Global** (≈145k locations) | **Yes (by week/month)** | Cities/stations | ISD/MERRA-2 reanalysis | weatherspark.com |
| Nomad List / Nomads.com "Climate Finder" | Filter cities by temp / feels-like / humidity / AQI | **Global** | Monthly (forecast-style) | Cities only | (formerly) Dark Sky, WAQI/WHO | nomads.com/climate-finder |
| Köppen-Geiger maps (Beck et al., GloH2O) | Classifies climate zone (Cfb, Csb, etc.); 1-km raster | **Global** | No (annual class) | Raster (not ranked) | CRU/CHELSA, CMIP6 | gloh2o.org/koppen |
| Wheeler/AMS, "Finding the World's Best Weather with UTCI" (2022) | Ranks stations by hours of "Golden" / no-thermal-stress weather | **Global** | Implicit (hourly→annual) | Stations/cities only | Global METAR/ISD 2021 + UTCI | ui.adsabs.harvard.edu |
| Tourism Climate Index (Mieczkowski 1985) / CIT / Holiday Climate Index | Academic 0–100 climate-for-tourism score | **Global-capable** (applied regionally) | Monthly | Grid/stations | Climate normals/reanalysis | (academic) |
| Global Residence Index "Climate Index" / Remitly "temperate cities" | Editorial best-climate city lists | Global | No | Cities | Mixed | globalresidenceindex.com |

### Details

**Kelly Norton — "The Pleasant Places to Live" (Feb 2014).** The canonical pleasant-day model. A day is "pleasant" when *mean temp is 55–75 °F, min > 45 °F, max < 85 °F, and there is no significant precipitation or snow depth* (note: 85 °F max, confirmed against the primary source — some secondary write-ups misquote it as 90 °F). Built from the **NOAA Global Summary of the Day** archive (23 years). It counts pleasant **days per year** per station. **US only**, annual (not by month), stations only — no country aggregation, no live interactivity beyond the static map. Los Angeles ranked #1 with 183 pleasant days/yr.
URL: https://kellegous.com/j/2014/02/03/pleasant-places/

**Taras Kaduk replication (2019).** Open reproduction/extension of Norton in R using NOAA GSOD; surfaces best/worst weather places and seasonal variation. Still US-focused, station-based.
URL: https://taraskaduk.com/2019/02/18/weather/

**Sperling's BestPlaces "Comfort Index."** The closest commercial analog to a comfort score, but **US only**. Initial scores tally the number of degrees outside a comfort band (cited variously as 60–80 °F, with a 70–80 °F sweet spot), penalize days/month outside the band and extreme highs/lows, and adjust by **monthly average dew point**. The Summer Comfort Index uses **seven climate variables**: total precipitation, daily min & max temp, extreme high/low temp, average dew point, and precipitation days. Output is 0–100; the **US average ≈ 54/100**.
URLs: https://www.bestplaces.net/docs/studies/most_comfortable_summer_cities.aspx ; https://www.bertsperling.com/2013/07/02/sizzling-cities-ranked-our-new-heat-index/

**WeatherSpark.** The strongest existing GLOBAL, by-time-of-year tool. Provides typical-weather reports for ~145,000 locations worldwide and computes a **Tourism Score** (favors clear, rainless days with perceived temps **65–80 °F / 18–27 °C**) and a **Beach/Pool Score**, plotted across the year. BUT: it is a per-location report/comparison tool, **not a single ranked global leaderboard**, and it does not roll up to country-level scores or expose a configurable health-weighted comfort index.
URL: https://weatherspark.com/

**Nomad List / Nomads.com "Climate Finder."** Global city filter on temperature, "feels like" (apparent) temperature, humidity, rainfall, and air quality, with monthly historical-as-forecast values. Data historically from Dark Sky (weather) + World Air Quality Index / WHO / AirVisual (AQI). It's a **filter**, not a comfort-ranked index, and **cities only**.
URL: https://nomads.com/climate-finder

**Köppen-Geiger comfort maps.** Köppen-Geiger classification (Beck/GloH2O, Nature Sci Data 2018 & 2023) gives a 1-km global raster of climate *type* (Cfb oceanic, Csa/Csb Mediterranean, etc.). People informally treat **Cfb (oceanic)** and **Csb (warm-summer Mediterranean)** as the "ideal/perfect" climates, but Köppen is a **classification, not a ranking** and has no by-month comfort score. "Double-Köppen"/"perfect climate" maps are enthusiast overlays highlighting Cfb/Csb zones — not quantitative.
URLs: https://www.gloh2o.org/koppen/ ; https://www.nature.com/articles/sdata2018214 ; https://www.nature.com/articles/s41597-023-02549-6

**"Finding the World's Best Weather with the Universal Thermal Climate Index" (S. Wheeler / Weather Source, AMS Annual Meeting 2022).** Downloaded global hourly METAR for all of 2021, computed **UTCI** per observation, and ranked locations by frequency of comfortable weather. Defines a **"Golden"** near-perfect category = UTCI in the comfort zone **18–26 °C** PLUS daytime with some sunshine AND no precipitation, fog, high wind, or low visibility. (Press coverage of related analyses crowns **San Diego** the "ideal climate.") This is the closest academic attempt at a global comfort ranking, but it's **stations/cities only, single-year, not interactive, and not country-aggregated.**
URLs: https://ui.adsabs.harvard.edu/abs/2022AMS...10291229W/abstract ; https://www.cbs8.com/article/news/local/which-city-has-the-ideal-climate/509-df0e468f-5ae3-4b63-b486-e8d0b66f9f2e

**Tourism Climate Index (Mieczkowski 1985), CIT (2nd-gen), Holiday Climate Index (HCI).** Academic 0–100 indices combining ~7 variables (max & mean temp, min & mean RH, precipitation, sunshine/insolation, wind). TCI's preferred **daytime max = 20–27 °C**; tourist "ideal" air temp ≈ 28–32 °C depending on region/origin; mountain-tourism ideal **21–25 °C** (unacceptable <15 °C or >30 °C). Globally applicable but usually applied to specific regions; not packaged as a live global city+country map.
URLs: https://link.springer.com/article/10.1186/s40322-016-0034-y ; https://www.researchgate.net/figure/Tourism-climatic-index-rating-system-Mieczkowski-1985_tbl1_315840142

### Direct answer: has anyone built a GLOBAL, by-month, comfort-ranked interactive map ranking cities AND countries?

**No — not in the exact form proposed.** The space is well-covered in *pieces*, but no single tool does all four at once:

- **Global, by-month, comfort-scored, interactive** → **WeatherSpark** is closest, but it is a per-location report/comparison, **not one ranked leaderboard**, and has **no country roll-up** and **no configurable health-weighted score**.
- **Comfort-ranked leaderboard** → **Sperling Comfort Index** and **Norton** do this, but both are **US-only** and **not by month** (annual).
- **Global comfort ranking via a proper thermal index** → the **AMS/UTCI "World's Best Weather"** study does it, but it's **academic, single-year, static, stations-only, no countries.**
- **Country-level comfort ranking by month, interactive** → effectively **nobody.**

**The gaps you can own:**
1. **Country-level comfort scores** (aggregate cities/grid → national monthly comfort) — essentially unoccupied.
2. **One unified, configurable 0–100 comfort score** spanning temperature + humidity/dew point + rainfall (+ optional sunshine), **by month**, **globally**, for **both cities and countries**, on a single interactive ranked map — no incumbent combines all of these.
3. **A HEALTH layer** (U-shaped mortality optimum, humidity-respiratory band) layered on top of "pleasantness" — none of the prior art does health-weighting.
4. **"Best month to be here" / "where is most comfortable in <month>"** as a first-class interaction — only WeatherSpark gestures at this and not as a global ranking.

---

## PART 2 — THE SCIENCE OF A COMFORTABLE & HEALTHY HUMAN CLIMATE

Concrete, citable numeric thresholds, organized so they can be encoded into a 0–100 score from monthly mean/min/max temperature, relative humidity (RH), and rainfall.

### 2.1 Thermoneutral / comfort temperature zone — ASHRAE 55

- **Operative temperature comfort range ≈ 67–82 °F (≈ 19.5–28 °C)**, depending on humidity, season, clothing (clo), activity (met), air speed, and mean radiant temperature. ASHRAE 55 defines the comfort zone as conditions acceptable to **≥ 80% of occupants** (PMV between −0.5 and +0.5).
- Typical sedentary indoor "centers": **winter ≈ 68–75 °F (20–24 °C)**, **summer ≈ 75–80 °F (24–27 °C)**.
- **Humidity limits (ASHRAE 55):** upper bound set by a **humidity ratio ≤ 0.012 kg water / kg dry air** (≈ dew point ≤ 16–17 °C); **no lower humidity limit** is specified for thermal comfort (low-RH limits come from health/comfort of mucous membranes, not heat balance).
- Sources: https://en.wikipedia.org/wiki/ASHRAE_55 ; https://www.simscale.com/blog/what-is-ashrae-55-thermal-comfort/ ; https://www.ashrae.org/File%20Library/Technical%20Resources/Technical%20FAQs/TC-02.01-FAQ-92.pdf

### 2.2 "Pleasant outdoor day" definitions (directly encodable)

- **Kelly Norton (2014):** mean **55–75 °F (12.8–23.9 °C)**, min **> 45 °F (7.2 °C)**, max **< 85 °F (29.4 °C)**, no significant precip/snow.
- **WeatherSpark Tourism Score:** clear, rainless, perceived temp **65–80 °F (18–27 °C)**.
- **Tourism Climate Index (Mieczkowski):** ideal daytime max **20–27 °C**; comfort falls off below ~20 °C and above ~27–30 °C.
- **Practical consensus "pleasant" band:** **mean ~18–24 °C (64–75 °F)**, **daytime max ≲ 29–30 °C**, **night min ≳ 7–10 °C** but not so warm it impairs sleep (night min ideally ≤ ~20 °C).
- Sources: https://kellegous.com/j/2014/02/03/pleasant-places/ ; https://weatherspark.com/ ; https://www.researchgate.net/figure/Tourism-climatic-index-rating-system-Mieczkowski-1985_tbl1_315840142

### 2.3 Ideal relative humidity band

- **Comfort + health sweet spot: RH 30–60%** (commonly tightened to **40–60%** for health).
- **< 30–40% RH:** dry mucous membranes, higher respiratory-infection susceptibility, eye/skin irritation; enveloped viruses (influenza, SARS-CoV-2) survive **longer** at ~20–30% RH.
- **> 60–70% RH:** mold/dust-mite growth, feels muggy, impairs evaporative cooling.
- The **"40to60RH"** evidence campaign: keeping indoor RH **40–60%** reduces respiratory infections; a barracks study found **14% fewer** respiratory infections in humidified (40–60%) vs non-humidified quarters.
- Sources: https://40to60rh.com/ ; https://www.nature.com/articles/s41598-022-15703-8 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9261129/

### 2.4 Dew-point comfort thresholds (better than RH for outdoor "muggy" feel)

Dew point is the cleanest single moisture comfort variable (absolute, temperature-independent). Standard human-comfort scale:

| Dew point | Feel |
|---|---|
| **< 10 °C (< 50 °F)** | Dry, crisp, very comfortable |
| **10–13 °C (50–55 °F)** | Comfortable |
| **13–16 °C (55–60 °F)** | Becoming "sticky" to some |
| **16–18 °C (60–65 °F)** | Noticeably humid/sticky |
| **18–21 °C (65–70 °F)** | Uncomfortable, oppressive |
| **> 21 °C (> 70 °F)** | Muggy, almost everyone feels "sticky"; oppressive |
| **> 24 °C (> 75 °F)** | Miserable / dangerous with heat |

Key thresholds to encode: **dew point < 13 °C = comfortable; > 18 °C = oppressive; > 21 °C = muggy/oppressive.**
Sources: https://en.wikipedia.org/wiki/Dew_point ; https://www.almanac.com/dewpoint ; https://www.eco-savvy.blog/high-dew-point-oppressive-humidity

If only RH + temp are available, derive dew point with the **Magnus formula**:
`γ = ln(RH/100) + (17.625·T)/(243.04+T)` (T in °C); `Td = 243.04·γ / (17.625 − γ)`.

### 2.5 Thermal comfort indices (apparent / "feels-like" temperature)

**UTCI (Universal Thermal Climate Index)** — best modern outdoor index (combines air temp, mean radiant temp, vapor pressure, wind). Stress categories:

| UTCI (°C) | Category |
|---|---|
| > 46 | Extreme heat stress |
| 38–46 | Very strong heat stress |
| 32–38 | Strong heat stress |
| 26–32 | Moderate heat stress |
| **18–26** | **Comfortable (no thermal stress, ideal sub-band)** |
| **9–18** | No thermal stress ("cool" sub-band) |
| 0–9 | Slight cold stress |
| −13–0 | Moderate cold stress |
| −27 to −13 | Strong cold stress |
| −40 to −27 | Very strong cold stress |

→ Encode **"no thermal stress" = UTCI 9–26 °C**, with the **ideal core = 18–26 °C**.
Sources: https://thermofeel.readthedocs.io/en/latest/guide/utci.html ; https://www.researchgate.net/figure/Universal-Thermal-Climate-Index-UTCI-thermal-stress-category-and-its-corresponding_tbl1_339048806

**Heat Index (NWS / Rothfusz 1990)** — apparent temp from T (°F) and RH (%). Apply when T ≥ 80 °F:
```
HI = -42.379 + 2.04901523·T + 10.14333127·RH − 0.22475541·T·RH
     − 0.00683783·T² − 0.05481717·RH² + 0.00122874·T²·RH
     + 0.00085282·T·RH² − 0.00000199·T²·RH²
```
(With low-RH and high-RH adjustments.) Caution zones: **HI 80–90 °F** caution; **90–103 °F** extreme caution; **103–124 °F** danger; **≥125 °F** extreme danger.
Sources: https://www.wpc.ncep.noaa.gov/heat_index/hi_equation.html ; https://www.weather.gov/media/ffc/ta_htindx.PDF

**Humidex (Environment Canada, Masterton & Richardson 1979)** — dew-point-based:
```
H = T + 0.5555·(e − 10),  where e = 6.11·exp[5417.7530·(1/273.16 − 1/(273.15 + Td))]
```
(T = air temp °C, Td = dew point °C, e = vapor pressure hPa.) Comfort scale: **20–29 little/no discomfort; 30–39 some discomfort; 40–45 great discomfort (avoid exertion); >45 dangerous (heat stroke possible).**
Sources: https://en.wikipedia.org/wiki/Humidex

**WBGT (Wet-Bulb Globe Temperature)** — heat-safety standard (air temp, humidity, wind, radiation). Activity guidance often flags caution above **~28 °C WBGT** and high risk above **~31–32 °C WBGT**. **Survivability limit:** long held at **wet-bulb 35 °C** (= 35 °C @ 100% RH, or 46 °C @ 50% RH); recent Penn State human trials put the real limit lower, **~31.5 °C wet-bulb** for young healthy adults. (Mostly relevant as an upper "uninhabitable" cutoff, not day-to-day comfort.)
Sources: https://en.wikipedia.org/wiki/Wet-bulb_globe_temperature ; https://iopscience.iop.org/article/10.1088/1748-9326/ace83c

### 2.6 HEALTH / MORTALITY evidence (the U-shaped temp–mortality curve)

This is what turns a "pleasant" score into a "healthy" score.

- **Shape:** temperature–mortality is **U/J-shaped** — risk is minimized at an optimum (the **Minimum Mortality Temperature, MMT**) and rises on both the cold and hot sides.
- **Where the optimum sits:** MMT corresponds to roughly the **60th percentile of local temperature in tropical areas** and the **80th–90th percentile in temperate regions** (i.e., it **adapts to local climate**). In absolute terms across **420 cities, MMT spans ~12 °C (54 °F) to ~30 °C (86 °F)** — e.g., ~**18 °C in Vancouver/London**, ~**25 °C in Buenos Aires/Beijing**. Lowest non-accidental mortality is frequently reported near **~21 °C**, with the best survival band around **daily max 20–25 °C**. A reasonable global "healthy optimum" to anchor on is **~18–24 °C mean**.
- **Cold kills more than heat (in total burden):** Gasparrini et al., *Lancet* 2015 (multicountry, 384 locations, 74 million deaths): **7.7% of deaths attributable to non-optimal temperature**, of which **cold ≈ 7.3% vs heat ≈ 0.4%** (cold accounts for ~17–20× more deaths). **Moderate (non-extreme) cold and heat** cause the bulk of deaths, **not** extreme events. Cold-related deaths are dominated by *moderately* cold days.
- **Implication for scoring:** asymmetry matters. Being a few degrees **below** optimum is, statistically, deadlier than being a few degrees **above** it — but extreme heat ramps risk steeply once past ~the 99th percentile / WBGT limits. A health-aware score should penalize **persistent cold** as well as heat, with the worst penalties reserved for the extremes on both ends.
- **Humidity & respiratory health:** beyond heat stress, **low absolute/relative humidity in cold months** raises influenza/respiratory-infection transmission and severity; **RH 40–60%** is protective. High humidity worsens heat-illness risk by blocking sweat evaporation (captured via dew point / heat index / WBGT).
- Sources: Gasparrini et al. 2015, *Lancet* https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)62114-0/fulltext ; https://pubmed.ncbi.nlm.nih.gov/26003380/ ; Our World in Data https://ourworldindata.org/part-one-how-many-people-die-from-extreme-temperatures-and-how-could-this-change-in-the-future ; https://thebreakthrough.org/issues/energy/human-deaths-from-hot-and-cold-temperatures-and-implications-for-climate-change

### 2.7 Sunshine, rainfall & wellbeing

- **Sunshine:** more daily sunlight → higher serotonin/vitamin D, better mood; **shorter winter daylight drives Seasonal Affective Disorder (SAD)** (≈1 in 10 affected at higher latitudes). Bright-light therapy (10,000 lux, 20–30 min/morning) improves SAD symptoms **50–80%**. → reward sunshine hours / penalize chronically overcast, dark months.
- **Rainfall:** light-to-moderate rainfall supports comfort and greenery, but **frequent rain days and heavy monthly totals reduce "pleasant day" counts** (Norton & TCI both exclude/penalize wet days). Encode via **rain days/month** and/or **monthly precipitation total**, with a sweet spot (neither arid nor incessantly wet) rather than "less is always better."
- Sources: https://www.nimh.nih.gov/health/publications/seasonal-affective-disorder ; https://www.calm.com/blog/sunlight-and-anxiety

---

## PART 3 — PROPOSED 0–100 COMFORT SCORE (encodable from monthly T_mean, T_min, T_max, RH, rainfall)

Compute four sub-scores in [0,1], combine, scale to 100. Designed so each month of each place gets a score; average/rank to compare places, and pick a place's best month.

**Step 0 — derive dew point** from T_mean + RH (Magnus formula, §2.4).

**1) Temperature comfort (weight 0.45)** — peak at the healthy optimum, asymmetric (cold penalized harder, per §2.6):
```
optimum = 21 °C (mean)
if T_mean ≤ 21:  Tscore = max(0, 1 − ((21 − T_mean)/13)²)     # ~0 by ~8 °C mean
if T_mean > 21:  Tscore = max(0, 1 − ((T_mean − 21)/12)²)     # ~0 by ~33 °C mean
# hard caps from the pleasant-day envelope:
if T_max ≥ 35 °C  →  Tscore ×= 0.4      # dangerous daytime heat
if T_min ≤ 0 °C   →  Tscore ×= 0.5      # freezing nights
if T_min ≥ 24 °C  →  Tscore ×= 0.7      # sleep-disrupting warm nights
```

**2) Humidity / mugginess (weight 0.25)** — via dew point (Td, °C):
```
if Td < 13:   Hscore = 1.0
elif Td<16:   Hscore = 0.8
elif Td<18:   Hscore = 0.6
elif Td<21:   Hscore = 0.35
else:         Hscore = max(0, 0.2 − (Td−21)·0.03)
# dryness penalty (health): if RH < 30%  →  Hscore ×= 0.9
```

**3) Sunshine / dryness of sky (weight 0.20)** — proxy via rain days or sunshine hours:
```
# if rain_days/month available:
Sscore = clamp(1 − rain_days/20, 0, 1)        # 0 rain days→1; ~20+→0
# health floor for aridity: very heavy monthly precip (>250 mm) also caps comfort slightly
```

**4) Rainfall amount (weight 0.10)** — sweet-spot, not "less is better":
```
ideal monthly precip ≈ 30–80 mm
Rscore = 1 − min(1, |P − 55| / 150)            # peaks ~55 mm, eases off both ways
```

**Combine:**
```
Comfort = 100 × (0.45·Tscore + 0.25·Hscore + 0.20·Sscore + 0.10·Rscore)
```

**Optional "feels-like" upgrade:** if wind data is available, replace the raw temperature comfort with **UTCI** (ideal band 18–26 °C → Tscore=1, decaying to 9 °C and 32 °C) and/or compute **Heat Index/Humidex** to drive the heat-side penalty — this folds temperature+humidity into one physiologically grounded variable and matches the prior-art best practice (UTCI per the AMS study).

**Country aggregation:** population-weight (or area-weight) the city/grid monthly scores within each country to produce a national monthly comfort score — the genuinely novel layer no incumbent provides.

---

## Source list (primary URLs)

Prior art: https://kellegous.com/j/2014/02/03/pleasant-places/ · https://taraskaduk.com/2019/02/18/weather/ · https://www.bestplaces.net/docs/studies/most_comfortable_summer_cities.aspx · https://www.bertsperling.com/2013/07/02/sizzling-cities-ranked-our-new-heat-index/ · https://weatherspark.com/ · https://nomads.com/climate-finder · https://www.gloh2o.org/koppen/ · https://www.nature.com/articles/sdata2018214 · https://ui.adsabs.harvard.edu/abs/2022AMS...10291229W/abstract · https://www.cbs8.com/article/news/local/which-city-has-the-ideal-climate/509-df0e468f-5ae3-4b63-b486-e8d0b66f9f2e · https://link.springer.com/article/10.1186/s40322-016-0034-y

Science: https://en.wikipedia.org/wiki/ASHRAE_55 · https://www.simscale.com/blog/what-is-ashrae-55-thermal-comfort/ · https://en.wikipedia.org/wiki/Dew_point · https://www.almanac.com/dewpoint · https://40to60rh.com/ · https://www.nature.com/articles/s41598-022-15703-8 · https://thermofeel.readthedocs.io/en/latest/guide/utci.html · https://www.wpc.ncep.noaa.gov/heat_index/hi_equation.html · https://www.weather.gov/media/ffc/ta_htindx.PDF · https://en.wikipedia.org/wiki/Humidex · https://en.wikipedia.org/wiki/Wet-bulb_globe_temperature · https://iopscience.iop.org/article/10.1088/1748-9326/ace83c · https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)62114-0/fulltext · https://pubmed.ncbi.nlm.nih.gov/26003380/ · https://ourworldindata.org/part-one-how-many-people-die-from-extreme-temperatures-and-how-could-this-change-in-the-future · https://www.nimh.nih.gov/health/publications/seasonal-affective-disorder

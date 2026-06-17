/* ============================================================================
   Global Climate Explorer — a living globe of the world's climate, month by month.
   The Earth is painted blue (cold) → green (most comfortable) → red (too hot) from
   WorldClim monthly normals. Pick a month (or year-round), switch between Comfort /
   Temperature / Humidity / Rainfall, set your own ideal climate, and see the best
   places ranked by city and country. Engine: globe.gl. See About for data & method.
   ========================================================================== */
'use strict';

/* ----------------------------- data --------------------------------------- */
const GRID = window.GCE_GRID || { n: 0, lat: [], lon: [], ta: [], rh: [], pr: [] };
const CITIES = window.GCE_CITIES || [];
const COUNTRIES = window.GCE_COUNTRIES || {};
const GN = GRID.n;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ----------------------------- helpers ------------------------------------ */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const r0 = v => v == null || isNaN(v) ? '—' : Math.round(v);
const f1 = v => v == null || isNaN(v) ? '—' : (Math.round(v * 10) / 10).toFixed(1);
function flag(iso2) {
  if (!iso2 || iso2.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* ----------------------------- layers / presets --------------------------- */
const LAYERS = [
  { key:'comfort',  name:'Comfort',     ic:'⭐', desc:'How comfortable & healthy the climate is' },
  { key:'temp',     name:'Temperature', ic:'🌡️', desc:'Average temperature' },
  { key:'humidity', name:'Humidity',    ic:'💧', desc:'Relative humidity' },
  { key:'rain',     name:'Rainfall',    ic:'🌧️', desc:'Monthly precipitation' },
];
const LAYER = {}; LAYERS.forEach(l => LAYER[l.key] = l);
const PRESETS = [
  { id:'comfortable', name:'Comfortable', ic:'⭐', p:{ idealT:21, tWidth:11, humidW:65, rainMode:0 } },
  { id:'beach',       name:'Beach & warm', ic:'🏖️', p:{ idealT:28, tWidth:8,  humidW:45, rainMode:-0.6 } },
  { id:'cool',        name:'Cool & fresh', ic:'🍃', p:{ idealT:15, tWidth:9,  humidW:55, rainMode:0 } },
  { id:'ski',         name:'Ski & snow',   ic:'⛷️', p:{ idealT:-2, tWidth:9,  humidW:25, rainMode:0.55 } },
  { id:'rainy',       name:'Lush & rainy', ic:'🌧️', p:{ idealT:19, tWidth:11, humidW:30, rainMode:0.85 } },
  { id:'hotdry',      name:'Hot & dry',    ic:'🏜️', p:{ idealT:31, tWidth:9,  humidW:78, rainMode:-0.95 } },
];

/* ----------------------------- comfort model ------------------------------ */
function dewpoint(t, rh) { const a = 17.27, b = 237.7, g = Math.log(Math.max(rh, 1) / 100) + a * t / (b + t); return b * g / (a - g); }
function tempScore(ta, tmn, tmx, P) {
  let s = Math.exp(-Math.pow((ta - P.idealT) / P.tWidth, 2));
  if (tmx != null && tmx > 35) s *= Math.max(0, 1 - (tmx - 35) / 8);   // scorching days (health)
  if (tmn != null && tmn < -15) s *= Math.max(0.3, 1 + (tmn + 15) / 20); // brutal cold (health)
  return clamp(s, 0, 1);
}
function humidScore(ta, rh, P) {
  const td = dewpoint(ta, rh);
  const raw = td < 13 ? 1 : td >= 24 ? 0 : 1 - (td - 13) / 11;
  return 1 - (P.humidW / 100) * (1 - raw);
}
function rainScore(pr, P) {
  if (P.rainMode <= -0.34) return clamp(1 - pr / 130, 0, 1);              // prefer dry
  if (P.rainMode >= 0.34) return clamp(pr / 160, 0, 1);                   // prefer wet
  return pr <= 50 ? 0.5 + 0.5 * pr / 50 : Math.max(0, 1 - (pr - 50) / 250); // sweet spot
}
function comfortScore(ta, tmn, tmx, rh, pr, P) {
  return 100 * (0.5 * tempScore(ta, tmn, tmx, P) + 0.3 * humidScore(ta, rh, P) + 0.2 * rainScore(pr, P));
}

/* ----------------------------- colour scales ------------------------------ */
function scaleRGB(S, v) {
  if (v == null || isNaN(v)) return [70, 90, 105];
  if (v <= S[0][0]) return S[0][1];
  if (v >= S[S.length - 1][0]) return S[S.length - 1][1];
  for (let i = 0; i < S.length - 1; i++) { const [a, ca] = S[i], [b, cb] = S[i + 1]; if (v >= a && v <= b) { const t = (v - a) / (b - a); return [0,1,2].map(k => Math.round(lerp(ca[k], cb[k], t))); } }
  return [70, 90, 105];
}
const TEMP_SCALE = [[-20,[44,58,150]],[-8,[58,110,215]],[2,[78,168,255]],[10,[95,212,205]],[16,[70,205,160]],[21,[53,211,160]],[25,[150,212,92]],[29,[255,216,77]],[33,[255,138,61]],[40,[255,90,77]],[50,[150,28,28]]];
const HUM_SCALE  = [[8,[214,184,128]],[28,[206,208,150]],[44,[120,206,150]],[58,[58,200,182]],[72,[70,168,232]],[88,[82,112,222]],[100,[96,72,182]]];
const RAIN_SCALE = [[0,[228,202,150]],[18,[212,206,140]],[48,[150,210,142]],[90,[78,200,172]],[150,[68,160,232]],[260,[66,98,212]],[480,[58,56,158]]];
const C_WARM = [[0,[255,90,77]],[0.4,[255,180,70]],[0.72,[178,210,92]],[1,[53,211,160]]];
const C_COLD = [[0,[70,110,210]],[0.4,[82,172,235]],[0.72,[112,206,196]],[1,[53,211,160]]];
function rampRGB(R, c) { c = clamp(c, 0, 1); for (let i = 0; i < R.length - 1; i++) { const [a, ca] = R[i], [b, cb] = R[i + 1]; if (c >= a && c <= b) { const t = (c - a) / (b - a); return [0,1,2].map(k => Math.round(lerp(ca[k], cb[k], t))); } } return R[R.length - 1][1]; }
function comfortRGB(ta, tmn, tmx, rh, pr) { const c = comfortScore(ta, tmn, tmx, rh, pr, PREFS) / 100; return rampRGB(ta >= PREFS.idealT ? C_WARM : C_COLD, c); }
const rgbCss = a => `rgb(${a[0]},${a[1]},${a[2]})`;

/* ----------------------------- state -------------------------------------- */
const PREFS = Object.assign({}, PRESETS[0].p);
const state = { layer:'comfort', month:0, preset:'comfortable', tab:'cities', sel:null, selType:null,
  filter:'all', mode:'globe', citiesOn:true, hover:null };
let globe, spinOn = true, panelOn = true, GEOland = null;
const elViz = document.getElementById('globeViz');
const elFlat = document.getElementById('flatViz');
const tooltip = document.getElementById('tooltip');

/* month accessors: m = 0 (year-round avg) or 1..12 */
function gridVar(arr, i, m) { if (m === 0) { let s = 0; for (let k = 0; k < 12; k++) s += arr[k][i]; return s / 12; } return arr[m - 1][i]; }
function cityVar(c, key, m) { const a = c[key]; if (m === 0) { let s = 0; for (let k = 0; k < 12; k++) s += a[k]; return s / 12; } return a[m - 1]; }

/* a place's "raw" value (for the active layer) and "score" (goodness 0-100) */
function placeColor(ta, tmn, tmx, rh, pr) {
  if (state.layer === 'comfort') return comfortRGB(ta, tmn, tmx, rh, pr);
  if (state.layer === 'temp') return scaleRGB(TEMP_SCALE, ta);
  if (state.layer === 'humidity') return scaleRGB(HUM_SCALE, rh);
  return scaleRGB(RAIN_SCALE, pr);
}
function cityScore(c, m) {
  const ta = cityVar(c,'ta',m), tmn = cityVar(c,'tmn',m), tmx = cityVar(c,'tmx',m), rh = cityVar(c,'rh',m), pr = cityVar(c,'pr',m);
  if (state.layer === 'comfort') {
    if (m === 0) { let s = 0; for (let k = 1; k <= 12; k++) s += cityScore(c, k); return s / 12; }
    return comfortScore(ta, tmn, tmx, rh, pr, PREFS);
  }
  if (state.layer === 'temp') return tempScore(ta, tmn, tmx, PREFS) * 100;
  if (state.layer === 'humidity') return humidScore(ta, rh, { humidW: 100 }) * 100;
  return rainScore(pr, PREFS) * 100;
}
function cityRawLabel(c, m) {
  const ta = cityVar(c,'ta',m), rh = cityVar(c,'rh',m), pr = cityVar(c,'pr',m);
  if (state.layer === 'temp') return f1(ta) + '°C';
  if (state.layer === 'humidity') return r0(rh) + '%';
  if (state.layer === 'rain') return r0(pr) + ' mm';
  return r0(cityScore(c, m)) + '/100';
}
function cityColor(c, m) { return placeColor(cityVar(c,'ta',m), cityVar(c,'tmn',m), cityVar(c,'tmx',m), cityVar(c,'rh',m), cityVar(c,'pr',m)); }

/* ============================== Wash texture ============================== */
const WASH_W = 360, WASH_H = 180;                 // raw 1° data grid
const dataCanvas = document.createElement('canvas'); dataCanvas.width = WASH_W; dataCanvas.height = WASH_H;
const dataCtx = dataCanvas.getContext('2d');
const washImg = dataCtx.createImageData(WASH_W, WASH_H);
const TEX_W = 2048, TEX_H = 1024;                 // smoothed display texture (power-of-two for clean mipmaps)
const washCanvas = document.createElement('canvas'); washCanvas.width = TEX_W; washCanvas.height = TEX_H;
const washCtx = washCanvas.getContext('2d');
const cellPix = new Int32Array(GN);
for (let i = 0; i < GN; i++) {
  const px = clamp(Math.floor((GRID.lon[i] + 180) / 360 * WASH_W), 0, WASH_W - 1);
  const py = clamp(Math.floor((90 - GRID.lat[i]) / 180 * WASH_H), 0, WASH_H - 1);
  cellPix[i] = py * WASH_W + px;
}
const OCEAN = [9, 28, 42];
function buildWash() {
  const m = state.month, d = washImg.data;
  for (let p = 0; p < d.length; p += 4) { d[p] = OCEAN[0]; d[p+1] = OCEAN[1]; d[p+2] = OCEAN[2]; d[p+3] = 255; }
  for (let i = 0; i < GN; i++) {
    const ta = gridVar(GRID.ta, i, m), rh = gridVar(GRID.rh, i, m), pr = gridVar(GRID.pr, i, m);
    const rgb = placeColor(ta, null, null, rh, pr);
    const p = cellPix[i] * 4;
    d[p] = rgb[0]; d[p+1] = rgb[1]; d[p+2] = rgb[2]; d[p+3] = 255;
  }
  dataCtx.putImageData(washImg, 0, 0);
  washCtx.imageSmoothingEnabled = true; washCtx.imageSmoothingQuality = 'high';
  washCtx.drawImage(dataCanvas, 0, 0, TEX_W, TEX_H);   // bilinear upscale → smooth wash
}
let globeTex = null;
function applyGlobeTexture() {
  if (!globe || state.mode !== 'globe') return;
  try {
    if (window.THREE) {
      if (!globeTex) { globeTex = new window.THREE.CanvasTexture(washCanvas); const m = globe.globeMaterial(); m.map = globeTex; m.color && m.color.set('#ffffff'); m.needsUpdate = true; }
      else globeTex.needsUpdate = true;
    } else { globe.globeImageUrl(washCanvas.toDataURL()); }
  } catch (e) { try { globe.globeImageUrl(washCanvas.toDataURL()); } catch (e2) {} }
}

/* ============================== Globe ===================================== */
function pointsData() { return state.citiesOn ? CITIES : []; }
function initGlobe() {
  buildWash();
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#4ea8ff').atmosphereAltitude(0.16)
    .globeImageUrl(washCanvas.toDataURL())
    .pointsData(pointsData())
    .pointLat(c => c.lat).pointLng(c => c.lon)
    .pointColor(c => rgbCss(cityColor(c, state.month)))
    .pointAltitude(0.007).pointRadius(c => c === selCity ? 0.34 : 0.16).pointResolution(8)
    .pointsMerge(false).pointsTransitionDuration(0).pointLabel(() => '')
    .onPointHover(onPtHover).onPointClick(c => selectCity(c, true));
  try { const m = globe.globeMaterial(); m.shininess = 4; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.3; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 101; ctr.maxDistance = 600;
  globe.pointOfView({ lat: 25, lng: 10, altitude: 2.5 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
  applyGlobeTexture();
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || innerWidth).height(elViz.clientHeight || (innerHeight - 103)); }
let selCity = null;
function refreshGlobe() {
  if (!globe || state.mode !== 'globe') return;
  buildWash(); applyGlobeTexture();
  globe.pointsData(pointsData()).pointColor(c => rgbCss(cityColor(c, state.month))).pointRadius(c => c === selCity ? 0.34 : 0.16);
}

/* ----------------------------- tooltip ------------------------------------ */
function showTip(html, x, y) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (x != null) { tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; } }
const hideTip = () => tooltip.classList.add('hidden');
let lastMouse = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('mousemove', e => { lastMouse = { x: e.clientX, y: e.clientY }; if (!tooltip.classList.contains('hidden')) { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; } });
function cityTip(c) {
  const m = state.month, rk = rankIndex(c);
  const ta = cityVar(c,'ta',m), tmn = cityVar(c,'tmn',m), tmx = cityVar(c,'tmx',m), rh = cityVar(c,'rh',m), pr = cityVar(c,'pr',m);
  const rawCol = rgbCss(placeColor(ta, tmn, tmx, rh, pr));
  return `<div class="tt-name"><span class="tt-flag">${flag(c.iso)}</span>${esc(c.n)}</div>` +
    `<div class="tt-sub">${COUNTRIES[c.iso] ? esc(COUNTRIES[c.iso].n) : c.iso} · ${monthLabel()}</div>` +
    `<div class="tt-score"><b style="color:${rawCol}">${cityRawLabel(c, m)}</b>` +
    `<span class="u">· comfort <b style="color:var(--txt)">${r0(cityScore2(c,m))}</b>/100${rk ? ` · #${rk}` : ''}</span></div>` +
    `<div class="tt-grid"><span>🌡️ <b>${f1(ta)}°</b></span><span>💧 <b>${r0(rh)}%</b></span><span>🌧️ <b>${r0(pr)}mm</b></span></div>` +
    `<div class="tt-hint">Click for the year-round profile ↗</div>`;
}
function cityScore2(c, m) { // always the comfort score (for the tooltip's comfort readout)
  if (m === 0) { let s = 0; for (let k = 1; k <= 12; k++) s += comfortScore(cityVar(c,'ta',k), cityVar(c,'tmn',k), cityVar(c,'tmx',k), cityVar(c,'rh',k), cityVar(c,'pr',k), PREFS); return s / 12; }
  return comfortScore(cityVar(c,'ta',m), cityVar(c,'tmn',m), cityVar(c,'tmx',m), cityVar(c,'rh',m), cityVar(c,'pr',m), PREFS);
}
function onPtHover(c) {
  state.hover = c || null;
  if (globe) globe.controls().autoRotate = !c && spinOn && !playT;
  if (!c) { hideTip(); return; }
  showTip(cityTip(c), lastMouse.x, lastMouse.y);
}

/* ----------------------------- selection ---------------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.4 }, 850); } }
function selectCity(c, doFly) { selCity = c; state.sel = c; state.selType = 'city'; refreshGlobe(); showCityDetail(c); markActive(); if (doFly) flyTo(c.lat, c.lon, 1.1); }
function selectCountry(iso, doFly) { state.sel = iso; state.selType = 'country'; showCountryDetail(iso); markActive(); const C = COUNTRIES[iso]; if (doFly && C && C.lat != null) flyTo(C.lat, C.lon, 1.7); }
function clearSel() { state.sel = null; state.selType = null; selCity = null; detailCard.classList.add('hidden'); refreshGlobe(); markActive(); }

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
const detailBody = document.getElementById('detailBody');
document.getElementById('detailClose').addEventListener('click', clearSel);
const TIER = v => v >= 80 ? 'World-class' : v >= 70 ? 'Excellent' : v >= 60 ? 'Very pleasant' : v >= 50 ? 'Pleasant' : v >= 40 ? 'Mixed' : v >= 28 ? 'Harsh' : 'Extreme';

function climateStrip(c) {
  // 12 rows: month, temp range bar (tmn..tmx), comfort dot
  const allMin = Math.min(...c.tmn), allMax = Math.max(...c.tmx);
  const lo = Math.floor(allMin / 5) * 5, hi = Math.ceil(allMax / 5) * 5, span = (hi - lo) || 1;
  const rows = MONTHS.map((mn, i) => {
    const a = (c.tmn[i] - lo) / span * 100, b = (c.tmx[i] - lo) / span * 100;
    const cf = comfortScore(c.ta[i], c.tmn[i], c.tmx[i], c.rh[i], c.pr[i], PREFS);
    const col = rgbCss(comfortRGB(c.ta[i], c.tmn[i], c.tmx[i], c.rh[i], c.pr[i]));
    const cur = (state.month === i + 1);
    return `<div class="cm-row"${cur ? ' style="background:rgba(255,255,255,.05);border-radius:7px"' : ''}><span class="cm-mon">${mn}</span>` +
      `<span class="cm-bar"><i style="left:${clamp(a,0,100)}%;width:${clamp(b-a,2,100)}%;background:linear-gradient(90deg,${rgbCss(scaleRGB(TEMP_SCALE,c.tmn[i]))},${rgbCss(scaleRGB(TEMP_SCALE,c.tmx[i]))})"></i></span>` +
      `<span class="cm-val"><b>${r0(c.ta[i])}°</b> · ${r0(c.pr[i])}mm · <b style="color:${col}">${r0(cf)}</b></span></div>`;
  }).join('');
  return `<div class="clim">${rows}</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:3px"><span>${lo}°C</span><span>bars = daily low→high · comfort</span><span>${hi}°C</span></div>`;
}
function bestMonths(c) {
  const scored = MONTHS.map((mn, i) => ({ mn, v: comfortScore(c.ta[i], c.tmn[i], c.tmx[i], c.rh[i], c.pr[i], PREFS) }));
  const best = scored.slice().sort((a, b) => b.v - a.v).slice(0, 3);
  const worst = scored.slice().sort((a, b) => a.v - b.v).slice(0, 2);
  return `<div class="d-best">${best.map(x => `<span class="d-chip good">${x.mn} ${r0(x.v)}</span>`).join('')}</div>` +
    `<div class="d-best" style="margin-top:5px">${worst.map(x => `<span class="d-chip bad">${x.mn} ${r0(x.v)}</span>`).join('')}</div>`;
}
function showCityDetail(c) {
  const ann = cityScore2(c, 0), rk = rankIndex(c);
  detailBody.innerHTML =
    `<div class="d-flagrow"><span class="d-flag">${flag(c.iso)}</span><div><div class="d-name">${esc(c.n)}</div><div class="d-sub">${COUNTRIES[c.iso] ? esc(COUNTRIES[c.iso].n) : c.iso} · pop ${(c.pop/1e6).toFixed(c.pop>=1e6?1:2)}M</div></div></div>` +
    `<div class="d-hero"><div><span class="d-bignum" style="color:${rgbCss(comfortRGB(cityVar(c,'ta',0),null,null,cityVar(c,'rh',0),cityVar(c,'pr',0)))}">${r0(ann)}</span><span class="d-bigu"> /100</span></div>` +
    `<div class="d-heror"><span class="d-tier" style="color:${rgbCss(comfortRGB(cityVar(c,'ta',0),null,null,cityVar(c,'rh',0),cityVar(c,'pr',0)))};border:1px solid currentColor">${TIER(ann)}</span><div class="d-rank">Year-round comfort${rk ? ` · ${monthLabel()} rank <b>#${rk}</b>` : ''}</div></div></div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>Best &amp; worst months</span><b>for you</b></div>${bestMonths(c)}</div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>The year in climate</span></div>${climateStrip(c)}</div>` +
    `<div class="d-src">Monthly normals (1970–2000), WorldClim 2.1 at this location. Comfort uses your current preferences — drag the timeline to highlight a month.</div>`;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function showCountryDetail(iso) {
  const cs = CITIES.filter(c => c.iso === iso); if (!cs.length) return;
  const C = COUNTRIES[iso] || { n: iso };
  const ann = countryScore(iso, 0), rkmap = countryRankMap(0);
  const top = cs.map(c => ({ c, v: cityScore2(c, 0) })).sort((a, b) => b.v - a.v).slice(0, 6);
  detailBody.innerHTML =
    `<div class="d-flagrow"><span class="d-flag">${flag(iso)}</span><div><div class="d-name">${esc(C.n)}</div><div class="d-sub">${cs.length} cities · pop-weighted climate</div></div></div>` +
    `<div class="d-hero"><div><span class="d-bignum" style="color:${rgbCss(rampRGB(C_WARM, ann/100))}">${r0(ann)}</span><span class="d-bigu"> /100</span></div>` +
    `<div class="d-heror"><span class="d-tier" style="color:${rgbCss(rampRGB(C_WARM, ann/100))};border:1px solid currentColor">${TIER(ann)}</span><div class="d-rank">Year-round · world rank <b>#${rkmap[iso]||'—'}</b></div></div></div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>Most comfortable cities</span></div>` +
    top.map(x => `<div class="cm-row" data-city="${CITIES.indexOf(x.c)}" style="cursor:pointer"><span class="cm-mon" style="width:auto;flex:1">${esc(x.c.n)}</span><span class="cm-val"><b style="color:${rgbCss(comfortRGB(cityVar(x.c,'ta',0),null,null,cityVar(x.c,'rh',0),cityVar(x.c,'pr',0)))}">${r0(x.v)}</b>/100</span></div>`).join('') + `</div>` +
    `<div class="d-src">Country score = population-weighted comfort of its cities (current preferences).</div>`;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
detailBody.addEventListener('click', e => {
  const r = e.target.closest('[data-city]'); if (r) selectCity(CITIES[+r.dataset.city], true);
});

/* ============================== Layer bar =============================== */
const layerBar = document.getElementById('layerBar');
function buildLayerBar() {
  layerBar.innerHTML = LAYERS.map(l => `<button class="layer-chip${l.key==='comfort'?' comfort':''}${state.layer===l.key?' on':''}" data-l="${l.key}"><span class="mc-ic">${l.ic}</span>${esc(l.name)}</button>`).join('');
}
layerBar.addEventListener('click', e => { const b = e.target.closest('.layer-chip'); if (b) setLayer(b.dataset.l); });
function setLayer(k) { state.layer = k; buildLayerBar(); updateLegend(); refreshAll(); }

/* ============================== Ranking ================================== */
const rankListEl = document.getElementById('rankList');
const rpStat = document.getElementById('rpStat'), rpSub = document.getElementById('rpSub');
const monthLabel = () => state.month === 0 ? 'Year-round' : MONTHS[state.month - 1];
const REGION_NOTE = {}; // (cities carry iso; region filter omitted for simplicity at city scale)
let ranked = [], rankPos = {};
function buildRankModel() {
  if (state.tab === 'cities') {
    ranked = CITIES.map(c => ({ c, v: cityScore(c, state.month), iso: c.iso, name: c.n })).sort((a, b) => b.v - a.v);
  } else {
    const isos = Object.keys(COUNTRIES).filter(iso => CITIES.some(c => c.iso === iso));
    ranked = isos.map(iso => ({ iso, name: (COUNTRIES[iso].n || iso), v: countryScore(iso, state.month) })).filter(x => !isNaN(x.v)).sort((a, b) => b.v - a.v);
  }
  rankPos = {}; ranked.forEach((x, i) => { rankPos[state.tab === 'cities' ? cityKey(x.c) : x.iso] = i + 1; });
}
const cityKey = c => CITIES.indexOf(c);
function rankIndex(c) { return state.tab === 'cities' ? rankPos[cityKey(c)] : null; }
function countryScore(iso, m) {
  const cs = CITIES.filter(c => c.iso === iso); if (!cs.length) return NaN;
  let num = 0, den = 0; for (const c of cs) { const w = Math.sqrt(c.pop); num += cityScore(c, m) * w; den += w; } return num / den;
}
let _crmCache = {};
function countryRankMap(m) {
  if (_crmCache.m === m && _crmCache.map) return _crmCache.map;
  const isos = Object.keys(COUNTRIES).filter(iso => CITIES.some(c => c.iso === iso));
  const arr = isos.map(iso => ({ iso, v: countryScore(iso, m) })).filter(x => !isNaN(x.v)).sort((a, b) => b.v - a.v);
  const map = {}; arr.forEach((x, i) => map[x.iso] = i + 1); _crmCache = { m, map }; return map;
}
function buildRank() {
  buildRankModel();
  const unit = state.layer === 'temp' ? '°C' : state.layer === 'humidity' ? '% RH' : state.layer === 'rain' ? 'mm' : '/100';
  rpSub.innerHTML = `Best <b>${esc(LAYER[state.layer].name.toLowerCase())}</b> · <b>${monthLabel()}</b>`;
  rpStat.innerHTML = `<b>${ranked.length}</b> ${state.tab} · ${esc(LAYER[state.layer].desc.toLowerCase())}`;
  rankListEl.innerHTML = ranked.slice(0, state.tab === 'cities' ? 400 : 300).map((x, i) => {
    const top = i < 3 ? ' top' + (i + 1) : '';
    const active = state.selType === state.tab.slice(0,-1) && (state.tab === 'cities' ? state.sel === x.c : state.sel === x.iso);
    const sub = state.tab === 'cities' ? (COUNTRIES[x.iso] ? esc(COUNTRIES[x.iso].n) : x.iso) : (CITIES.filter(c=>c.iso===x.iso).length + ' cities');
    const lab = state.tab === 'cities' && state.layer !== 'comfort' ? cityRawLabel(x.c, state.month) : r0(x.v);
    return `<div class="rk-row${top}${active ? ' active' : ''}" data-i="${i}"><span class="rk-rank">${i + 1}</span><span class="rk-flag">${flag(x.iso)}</span>` +
      `<span class="rk-main"><span class="rk-name">${esc(x.name)}</span><span class="rk-meta">${sub}</span></span>` +
      `<span class="rk-right"><span class="rk-le" style="color:${rgbCss(rampRGB(C_WARM, x.v/100))}">${lab}</span><span class="rk-bar"><i style="width:${clamp(x.v,3,100)}%;background:${rgbCss(rampRGB(C_WARM, x.v/100))}"></i></span></span></div>`;
  }).join('') || `<div class="rp-stat">No data.</div>`;
}
rankListEl.addEventListener('click', e => { const r = e.target.closest('.rk-row'); if (!r) return; const x = ranked[+r.dataset.i]; if (state.tab === 'cities') selectCity(x.c, true); else selectCountry(x.iso, true); });
document.getElementById('rpTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.tab = b.dataset.tab; document.querySelectorAll('#rpTabs button').forEach(x => x.classList.toggle('on', x === b)); buildRank(); });
function markActive() {
  rankListEl.querySelectorAll('.rk-row').forEach((r, idx) => {
    const x = ranked[+r.dataset.i]; if (!x) return;
    const on = state.tab === 'cities' ? (state.selType === 'city' && state.sel === x.c) : (state.selType === 'country' && state.sel === x.iso);
    r.classList.toggle('active', on);
  });
}
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Flat map ================================= */
let fctx, fX = 0, fY = 0, fPW = 0, fPH = 0, flatW = 0, flatH = 0;
const projX = lon => fX + (lon + 180) / 360 * fPW;
const projY = lat => fY + (90 - lat) / 180 * fPH;
function sizeFlat() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  flatW = elFlat.clientWidth; flatH = elFlat.clientHeight;
  elFlat.width = flatW * dpr; elFlat.height = flatH * dpr;
  fctx = elFlat.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fPW = Math.min(flatW * 0.98, flatH * 2 * 0.98); fPH = fPW / 2; fX = (flatW - fPW) / 2; fY = (flatH - fPH) / 2;
}
function drawFlat() {
  if (!fctx) return;
  fctx.clearRect(0, 0, flatW, flatH);
  fctx.fillStyle = '#06151f'; fctx.fillRect(0, 0, flatW, flatH);
  buildWash();
  fctx.imageSmoothingEnabled = true; fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(washCanvas, fX, fY, fPW, fPH);
  // city dots
  if (state.citiesOn) {
    for (const c of CITIES) {
      if (c.pop < 300000 && c !== selCity) continue; // thin out small cities on flat for clarity
      const x = projX(c.lon), y = projY(c.lat);
      fctx.beginPath(); fctx.arc(x, y, c === selCity ? 5 : 2.1, 0, 7);
      fctx.fillStyle = rgbCss(cityColor(c, state.month)); fctx.fill();
      fctx.strokeStyle = c === selCity ? '#fff' : 'rgba(0,0,0,.5)'; fctx.lineWidth = c === selCity ? 1.6 : 0.6; fctx.stroke();
    }
  }
}
function flatCityAt(x, y) { let best = null, bd = 100; for (const c of CITIES) { const dx = projX(c.lon) - x, dy = projY(c.lat) - y, d = dx*dx + dy*dy; if (d < bd && d < 90) { bd = d; best = c; } } return best; }
elFlat.addEventListener('mousemove', e => {
  if (state.mode !== 'flat') return;
  const rect = elFlat.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const c = flatCityAt(x, y);
  if (c) { elFlat.style.cursor = 'pointer'; showTip(cityTip(c), e.clientX, e.clientY); } else { elFlat.style.cursor = 'grab'; hideTip(); }
});
elFlat.addEventListener('mouseleave', hideTip);
elFlat.addEventListener('click', e => { const rect = elFlat.getBoundingClientRect(); const c = flatCityAt(e.clientX - rect.left, e.clientY - rect.top); if (c) selectCity(c, false); });
function setMode(m) {
  state.mode = m;
  elViz.classList.toggle('hidden', m !== 'globe'); elFlat.classList.toggle('hidden', m !== 'flat');
  document.getElementById('btnMap').classList.toggle('active', m === 'flat');
  document.getElementById('btnMap').querySelector('.mb-tx').textContent = m === 'flat' ? 'Globe' : 'Flat map';
  syncMenu('miMap', m === 'flat');
  if (m === 'flat') { sizeFlat(); drawFlat(); } else { sizeGlobe(); refreshGlobe(); }
}
document.getElementById('btnMap').addEventListener('click', () => setMode(state.mode === 'flat' ? 'globe' : 'flat'));

/* ============================== refresh all ============================= */
function refreshAll() { if (state.mode === 'globe') refreshGlobe(); else drawFlat(); buildRank(); if (state.sel != null) { if (state.selType === 'city') showCityDetail(state.sel); else showCountryDetail(state.sel); } }

/* ============================== Month timeline ========================== */
const tlSlider = document.getElementById('tlSlider'), tlPlay = document.getElementById('tlPlay');
const tlMonth = document.getElementById('tlMonth'), tlReadout = document.getElementById('tlReadout'), tlYearBtn = document.getElementById('tlYear');
document.getElementById('tlMarks').innerHTML = ['Year','J','F','M','A','M','J','J','A','S','O','N','D'].map(s => `<span>${s}</span>`).join('');
function applyMonth() {
  tlMonth.textContent = monthLabel();
  tlYearBtn.classList.toggle('on', state.month === 0);
  _crmCache = {};
  tlReadout.innerHTML = state.tab === 'cities'
    ? `best: <b>${ranked[0] ? esc(ranked[0].name) : '—'}</b>`
    : `best: <b>${ranked[0] ? esc(ranked[0].name) : '—'}</b>`;
  refreshAll();
  tlReadout.innerHTML = `best: <b>${ranked[0] ? esc(ranked[0].name) : '—'}</b>`;
}
tlSlider.addEventListener('input', () => { stopPlay(); state.month = +tlSlider.value; applyMonth(); });
tlYearBtn.addEventListener('click', () => { stopPlay(); state.month = 0; tlSlider.value = 0; applyMonth(); });
let playT = null;
function stopPlay() { if (playT) { clearInterval(playT); playT = null; } tlPlay.textContent = '▶'; tlPlay.classList.remove('on'); if (globe && state.mode === 'globe' && !state.hover) globe.controls().autoRotate = spinOn; }
function startPlay() {
  if (playT) { stopPlay(); return; }
  if (state.month === 0) state.month = 1;
  tlPlay.textContent = '⏸'; tlPlay.classList.add('on'); if (globe) globe.controls().autoRotate = false;
  playT = setInterval(() => { state.month = state.month >= 12 ? 1 : state.month + 1; tlSlider.value = state.month; applyMonth(); }, 850);
}
tlPlay.addEventListener('click', startPlay);

/* ============================== Preferences ============================= */
const prefbar = document.getElementById('prefbar'), pbBody = document.getElementById('pbBody'), pbShow = document.getElementById('pbShow');
const PF = [
  { k:'idealT', ic:'🌡️', name:'Ideal temperature', min:-5, max:35, fmt:v => v + '°C' },
  { k:'tWidth', ic:'🎯', name:'Temperature tolerance', min:5, max:18, fmt:v => v <= 8 ? 'fussy' : v >= 15 ? 'relaxed' : 'medium' },
  { k:'humidW', ic:'💧', name:'Humidity matters', min:0, max:100, fmt:v => v + '%' },
  { k:'rainMode', ic:'🌧️', name:'Rain', min:-100, max:100, fmt:v => v <= -34 ? 'prefer dry' : v >= 34 ? 'prefer wet' : 'balanced', scale:100 },
];
function buildPresets() { document.getElementById('pbPresets').innerHTML = PRESETS.map(p => `<button class="preset-chip${state.preset === p.id ? ' on' : ''}" data-p="${p.id}">${p.ic} ${esc(p.name)}</button>`).join(''); }
function buildPrefs() {
  pbBody.innerHTML = PF.map(f => {
    const raw = f.scale ? Math.round(PREFS[f.k] * f.scale) : PREFS[f.k];
    return `<div class="pf-row"><span class="pf-ic">${f.ic}</span><span class="pf-name">${esc(f.name)}</span>` +
      `<input class="pf-slider" type="range" min="${f.min}" max="${f.max}" step="1" value="${raw}" data-k="${f.k}"><span class="pf-val" data-v="${f.k}">${f.fmt(raw)}</span></div>`;
  }).join('');
}
pbBody.addEventListener('input', e => {
  const s = e.target.closest('.pf-slider'); if (!s) return; const f = PF.find(x => x.k === s.dataset.k);
  const raw = +s.value; PREFS[f.k] = f.scale ? raw / f.scale : raw;
  pbBody.querySelector(`[data-v="${f.k}"]`).textContent = f.fmt(raw);
  state.preset = matchPreset(); buildPresets();
  refreshAll();
});
function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id); if (!p) return;
  Object.assign(PREFS, p.p); state.preset = id; buildPresets(); buildPrefs();
  refreshAll(); toast(`${p.ic} ${p.name}`);
}
function matchPreset() { for (const p of PRESETS) if (Object.keys(p.p).every(k => Math.abs(PREFS[k] - p.p[k]) < 1e-6)) return p.id; return 'custom'; }
document.getElementById('pbPresets').addEventListener('click', e => { const b = e.target.closest('.preset-chip'); if (b) applyPreset(b.dataset.p); });
document.getElementById('pbReset').addEventListener('click', () => applyPreset('comfortable'));
function setPrefbar(on) { prefbar.classList.toggle('hidden', !on); pbShow.classList.toggle('hidden', on); document.getElementById('btnPrefs').classList.toggle('active', on); syncMenu('miPrefs', on); }
document.getElementById('pbCollapse').addEventListener('click', () => prefbar.classList.toggle('collapsed'));
document.getElementById('btnPrefs').addEventListener('click', () => { const h = prefbar.classList.contains('hidden'); setPrefbar(h); if (!h) prefbar.classList.remove('collapsed'); });
pbShow.addEventListener('click', () => setPrefbar(true));

/* ============================== Table =================================== */
const tableOverlay = document.getElementById('tableOverlay'), dataTable = document.getElementById('dataTable');
let tblSort = { key: 0, dir: -1 }, tblQuery = '';
function openTable() { buildTable(); tableOverlay.classList.remove('hidden'); }
function buildTable() {
  const rows = CITIES.map(c => ({ c, ann: cityScore2(c, 0), mon: MONTHS.map((_, i) => comfortScore(c.ta[i], c.tmn[i], c.tmx[i], c.rh[i], c.pr[i], PREFS)) }))
    .filter(r => !tblQuery || r.c.n.toLowerCase().includes(tblQuery))
    .sort((a, b) => { const av = tblSort.key === 0 ? a.ann : a.mon[tblSort.key - 1], bv = tblSort.key === 0 ? b.ann : b.mon[tblSort.key - 1]; return (av - bv) * tblSort.dir; });
  const head = `<thead><tr><th class="col-rank">#</th><th class="col-name">City</th>` +
    `<th data-s="0" class="${tblSort.key===0?'sorted':''}">Year</th>` +
    MONTHS.map((mn, i) => `<th data-s="${i+1}" class="${tblSort.key===i+1?'sorted':''}">${mn}</th>`).join('') + `</tr></thead>`;
  const body = '<tbody>' + rows.slice(0, 600).map((r, i) =>
    `<tr><td class="col-rank tbl-rk">${i+1}</td><td class="col-name" data-i="${CITIES.indexOf(r.c)}"><span class="tbl-flag">${flag(r.c.iso)}</span>${esc(r.c.n)}</td>` +
    `<td class="cell col-annual" style="background:${rgbCss(rampRGB(C_WARM, r.ann/100))}">${r0(r.ann)}</td>` +
    r.mon.map(v => `<td class="cell" style="background:${rgbCss(rampRGB(C_WARM, v/100))}">${r0(v)}</td>`).join('') + `</tr>`).join('') + '</tbody>';
  dataTable.innerHTML = head + body;
}
dataTable.addEventListener('click', e => {
  const th = e.target.closest('th[data-s]'); if (th) { const k = +th.dataset.s; if (tblSort.key === k) tblSort.dir *= -1; else tblSort = { key: k, dir: -1 }; buildTable(); return; }
  const nm = e.target.closest('.col-name[data-i]'); if (nm) { tableOverlay.classList.add('hidden'); selectCity(CITIES[+nm.dataset.i], true); }
});
document.getElementById('tblSearch').addEventListener('input', e => { tblQuery = e.target.value.trim().toLowerCase(); buildTable(); });
document.getElementById('tableClose').addEventListener('click', () => tableOverlay.classList.add('hidden'));
tableOverlay.addEventListener('click', e => { if (e.target === tableOverlay) tableOverlay.classList.add('hidden'); });
document.getElementById('btnTable').addEventListener('click', openTable);

/* ============================== Search ================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase(); if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  const cityHits = CITIES.filter(c => c.n.toLowerCase().includes(q)).sort((a, b) => b.pop - a.pop).slice(0, 7).map(c => ({ t:'c', c }));
  const ctryHits = Object.keys(COUNTRIES).filter(iso => COUNTRIES[iso].n && COUNTRIES[iso].n.toLowerCase().includes(q) && CITIES.some(c=>c.iso===iso)).slice(0, 3).map(iso => ({ t:'co', iso }));
  hits = [...ctryHits, ...cityHits].slice(0, 9);
  searchRes.innerHTML = hits.length ? hits.map((h, i) => h.t === 'c'
    ? `<div class="sr-item${i===0?' sel':''}" data-i="${i}"><span class="sr-ic">${flag(h.c.iso)}</span><span class="sr-name">${esc(h.c.n)}</span><span class="sr-sub">${COUNTRIES[h.c.iso]?esc(COUNTRIES[h.c.iso].n):h.c.iso}</span></div>`
    : `<div class="sr-item" data-i="${i}"><span class="sr-ic">${flag(h.iso)}</span><span class="sr-name">${esc(COUNTRIES[h.iso].n)}</span><span class="sr-sub">country</span></div>`).join('') : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) { const h = hits[i] || hits[0]; if (!h) return; searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur(); if (h.t === 'c') selectCity(h.c, true); else { state.tab = 'countries'; document.querySelectorAll('#rpTabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === 'countries')); buildRank(); selectCountry(h.iso, true); } }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend ================================= */
const legend = document.getElementById('legend');
document.getElementById('legendToggle').addEventListener('click', () => legend.classList.toggle('collapsed'));
function updateLegend() {
  document.getElementById('lgTitle').textContent = LAYER[state.layer].name;
  const grad = document.getElementById('lgGrad'), ticks = document.getElementById('lgTicks'), rows = document.getElementById('lgRows');
  let stops, tk, rw;
  if (state.layer === 'temp') { stops = TEMP_SCALE.map(s => [s[0], s[1]]); tk = ['-20','0','21','35','50°C']; rw = [['#4ea8ff','Cold'],['#35d3a0','Mild ~21°C'],['#ffd84d','Warm'],['#ff5a4d','Hot']]; }
  else if (state.layer === 'humidity') { stops = HUM_SCALE; tk = ['10','40','60','80','100%']; rw = [['#d6b880','Dry'],['#78ce96','Comfortable'],['#4ea8e8','Humid'],['#6048b6','Oppressive']]; }
  else if (state.layer === 'rain') { stops = RAIN_SCALE; tk = ['0','50','150','300','480mm']; rw = [['#e4ca96','Arid'],['#96d28e','Moderate'],['#4ea8e8','Wet'],['#3a389e','Monsoon']]; }
  else { stops = null; tk = ['cold','','perfect','','hot']; rw = [['#4ea8ff','Too cold'],['#35d3a0','Comfortable'],['#ffd84d','Warm'],['#ff5a4d','Too hot']]; }
  const gcss = state.layer === 'comfort' ? 'linear-gradient(90deg,#4ea8ff,#5ad1c5,#35d3a0,#ffd84d,#ff8a3d,#ff5a4d)'
    : 'linear-gradient(90deg,' + stops.map(s => rgbCss(s[1])).join(',') + ')';
  grad.style.background = gcss;
  ticks.innerHTML = tk.map(t => `<span>${t}</span>`).join('');
  rows.innerHTML = rw.map(r => `<div class="lg-row"><span class="lg-sw" style="background:${r[0]}"></span>${r[1]}</div>`).join('');
}

/* ============================== Menu / misc ============================ */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hover && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
let toastT = null;
function toast(msg) { const t = document.getElementById('toast'); if (!msg) { t.classList.remove('show'); return; } t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function setCities(on) { state.citiesOn = on; syncMenu('miCities', on); refreshAll(); }
function resetView() { clearSel(); stopPlay(); spinOn = true; syncSpin(); state.month = 0; tlSlider.value = 0; state.layer = 'comfort'; applyPreset('comfortable'); buildLayerBar(); updateLegend(); applyMonth(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = true; globe.pointOfView({ lat: 25, lng: 10, altitude: 2.5 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });
document.getElementById('miPrefs').addEventListener('click', () => { setPrefbar(prefbar.classList.contains('hidden')); menu.classList.add('hidden'); });
document.getElementById('miTable').addEventListener('click', () => { openTable(); menu.classList.add('hidden'); });
document.getElementById('miCities').addEventListener('click', () => { setCities(!state.citiesOn); menu.classList.add('hidden'); });
document.getElementById('miMap').addEventListener('click', () => { setMode(state.mode === 'flat' ? 'globe' : 'flat'); menu.classList.add('hidden'); });

/* about / welcome */
const aboutOverlay = document.getElementById('aboutOverlay'), welcome = document.getElementById('welcomeOverlay');
document.getElementById('abMethod').innerHTML = 'Each place is scored 0–100 from three components: <b>Temperature</b> (50%) peaks at your ideal — default ~21°C, the human comfort &amp; lowest-mortality optimum — falling off either side, with extra penalty for scorching days (max &gt;35°C) and brutal nights; <b>Humidity</b> (30%) via <b>dew point</b> (comfortable below 13°C, oppressive above ~21°C); <b>Rainfall</b> (20%) favouring a moderate sweet-spot. Switch the <b>⚙️ preferences</b> to move the ideal, chase cold, or prefer rain — the score &amp; map rebuild. Country scores are population-weighted from their cities.';
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'gce_seen_v1';
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (!tableOverlay.classList.contains('hidden')) return tableOverlay.classList.add('hidden'); if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden'); if (!welcome.classList.contains('hidden')) return hideWelcome(); if (!detailCard.classList.contains('hidden')) clearSel(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); startPlay(); }
  else if (e.key === 'ArrowRight') { stopPlay(); state.month = state.month >= 12 ? 0 : state.month + 1; tlSlider.value = state.month; applyMonth(); }
  else if (e.key === 'ArrowLeft') { stopPlay(); state.month = state.month <= 0 ? 12 : state.month - 1; tlSlider.value = state.month; applyMonth(); }
});

/* ============================== Boot =================================== */
window.addEventListener('resize', () => { if (state.mode === 'globe') sizeGlobe(); else { sizeFlat(); drawFlat(); } });
buildLayerBar(); buildPresets(); buildPrefs(); updateLegend(); buildRankModel(); buildRank();
setPrefbar(!window.matchMedia('(max-width:760px)').matches);
initGlobe();
applyMonth();
try {
  const q = new URLSearchParams(location.search);
  if (q.get('layer') && LAYER[q.get('layer')]) setLayer(q.get('layer'));
  if (q.get('preset')) applyPreset(q.get('preset'));
  const mm = q.get('m'); if (mm != null && +mm >= 0 && +mm <= 12) { state.month = +mm; tlSlider.value = state.month; applyMonth(); }
} catch (e) {}
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }

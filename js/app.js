// 전략 지도 · 연대기 · 세력 현황
const COLORS = { K: FACTIONS.joseon.color, J: FACTIONS.japan.color };
const TYPE_INFO = {
  land:  { name: '육전', cls: 't-land' },
  sea:   { name: '해전', cls: 't-sea' },
  siege: { name: '공성', cls: 't-siege' },
  event: { name: '사건', cls: 't-event' },
};

const fmt = (n) => n.toLocaleString('ko-KR');
const llOf = (p) => (Array.isArray(p) ? p : PLACES[p].ll);

const App = {
  idx: -1,
  mode: 'strategic',
  autoTimer: null,
  zones: {},
  labels: {},
};

// 사건별 누적 거점 지배 상태
const CONTROL = (() => {
  const cur = {};
  for (const id in PLACES) cur[id] = PLACES[id].fixed === 'japan' ? 'J' : 'K';
  return EVENTS.map((e) => {
    Object.assign(cur, e.ch);
    return { ...cur };
  });
})();

// 막대 그래프 기준 최댓값
const MAX = (() => {
  const m = { j: [0, 0, 0], w: [0, 0], m: [0, 0] };
  for (const e of EVENTS) {
    for (const k of ['j', 'w', 'm']) {
      m[k].forEach((_, i) => { m[k][i] = Math.max(m[k][i], e.f[k][i]); });
    }
  }
  return m;
})();

function initMap() {
  const map = L.map('map', { zoomControl: true, minZoom: 5, maxZoom: 17, worldCopyJump: false, zoomSnap: 0.25 })
    .setView([36.6, 127.6], 7);
  const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17, attribution: 'Tiles &copy; Esri',
  });
  const terrain = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17, maxNativeZoom: 13, attribution: 'Tiles &copy; Esri',
  });
  imagery.addTo(map);
  L.control.layers({ '위성 지형': imagery, '지형도': terrain, '고지도풍 (물길·산세만)': Terrain.makeBase('tilePane') }, null, { position: 'topright' }).addTo(map);
  map.attributionControl.setPrefix(false);

  App.map = map;
  Terrain.init(map);
  App.gZones = L.layerGroup().addTo(map);
  App.gLabels = L.layerGroup().addTo(map);
  App.gRoutes = L.layerGroup().addTo(map);
  App.gArmies = L.layerGroup().addTo(map);
  App.gPulse = L.layerGroup().addTo(map);

  for (const id in PLACES) {
    const p = PLACES[id];
    App.zones[id] = L.circle(p.ll, {
      radius: p.major ? 30000 : 19000, stroke: false, fillOpacity: 0.3, className: 'control-zone', interactive: false,
    }).addTo(App.gZones);
    App.labels[id] = L.marker(p.ll, { icon: L.divIcon({ className: '', html: '', iconSize: [0, 0] }), interactive: false, keyboard: false })
      .addTo(App.gLabels);
  }
}

function buildTimeline() {
  const el = document.getElementById('timeline');
  let lastPeriod = '';
  el.innerHTML = EVENTS.map((e, i) => {
    let h = '';
    if (e.period !== lastPeriod) { h += `<div class="period">${e.period}</div>`; lastPeriod = e.period; }
    const t = TYPE_INFO[e.type];
    const res = e.result === 'joseon' ? '<span class="tag win-joseon">조선 측 승리</span>'
      : e.result === 'japan' ? '<span class="tag win-japan">일본 측 우세</span>' : '';
    h += `<div class="ev" data-i="${i}">
      <span class="dot ${t.cls}"></span>
      <div class="ev-date">${e.date}</div>
      <div class="ev-title">${e.title}</div>
      <div class="ev-tags"><span class="tag">${t.name}</span>${res}${e.battle ? '<span class="tag battle">⚔ 전투 재생</span>' : ''}</div>
    </div>`;
    return h;
  }).join('');
  el.addEventListener('click', (ev) => {
    const item = ev.target.closest('.ev');
    if (!item) return;
    stopAuto();
    const i = +item.dataset.i;
    const playBattle = ev.target.classList.contains('battle');
    select(i, { playBattle });
  });
}

function select(i, opts = {}) {
  if (i < 0 || i >= EVENTS.length) return;
  if (App.mode === 'battle') { Battle.stop(true); restoreStrategic(); }
  const prevIdx = App.idx;
  App.idx = i;
  const e = EVENTS[i];

  document.querySelectorAll('.ev').forEach((n) => {
    const k = +n.dataset.i;
    n.classList.toggle('active', k === i);
    n.classList.toggle('past', k < i);
  });
  document.querySelector(`.ev[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  renderControl(prevIdx);
  renderRoutes(e);
  renderArmies(e);
  renderPulse(e);
  renderEventCard(e);
  renderPanel(i);

  App.map.flyTo(llOf(e.place), e.place === 'tsushima' ? 7 : 7.25, { duration: 0.9 });
  if (opts.playBattle && e.battle) setTimeout(() => startBattle(e), 300);
}

function renderControl(prevIdx) {
  const st = CONTROL[App.idx];
  const prev = prevIdx >= 0 ? CONTROL[prevIdx] : null;
  for (const id in PLACES) {
    const p = PLACES[id];
    const c = COLORS[st[id]];
    App.zones[id].setStyle({ fillColor: c, fillOpacity: st[id] === 'J' ? 0.36 : 0.22 });
    const changed = prev && prev[id] !== st[id];
    App.labels[id].setIcon(L.divIcon({
      className: '', iconSize: [0, 0],
      html: `<div class="place-label ${p.major ? 'major' : ''} ${changed ? 'flash' : ''}"><b style="background:${c}"></b>${p.name}</div>`,
    }));
  }
}

function routePoints(r) {
  let pts = ROUTES[r.id].path;
  if (r.upto !== undefined) {
    const cut = typeof r.upto === 'number' ? r.upto : pts.indexOf(r.upto);
    pts = pts.slice(0, cut + 1);
  }
  return pts.map(llOf);
}

function renderRoutes(e) {
  App.gRoutes.clearLayers();
  for (const r of e.routes) {
    const def = ROUTES[r.id];
    const pts = routePoints(r);
    if (pts.length < 2) continue;
    const color = FACTIONS[def.faction].color;
    L.polyline(pts, { color: '#000', weight: 6, opacity: 0.35, interactive: false }).addTo(App.gRoutes);
    L.polyline(pts, { color, weight: 3.5, opacity: 0.95, className: 'route-line', interactive: false }).addTo(App.gRoutes);
    // 화살촉
    const a = App.map.project(pts[pts.length - 2], 7), b = App.map.project(pts[pts.length - 1], 7);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    L.marker(pts[pts.length - 1], {
      interactive: false,
      icon: L.divIcon({ className: '', iconSize: [0, 0],
        html: `<svg width="22" height="22" viewBox="-11 -11 22 22" style="position:absolute;left:-11px;top:-11px;transform:rotate(${ang}deg);overflow:visible">
          <path d="M10 0 L-6 -7 L-2 0 L-6 7 Z" fill="${color}" stroke="#000" stroke-width="1"/></svg>` }),
    }).addTo(App.gRoutes);
    if (def.label) {
      const mid = pts[Math.min(1, pts.length - 1)];
      L.marker(mid, { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
        html: `<div class="route-label" style="background:${color}${def.faction === 'ming' ? ';color:#1b1408' : ''};transform:translate(6px,6px)">${def.label}</div>` }) }).addTo(App.gRoutes);
    }
  }
}

function renderArmies(e) {
  App.gArmies.clearLayers();
  for (const a of e.armies) {
    const c = FACTIONS[a.f].color;
    const size = a.ships ? `함선 ${fmt(a.ships)}척` : a.n ? `${fmt(a.n)}명` : '';
    L.marker(a.ll, { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
      html: `<div class="army" style="--c:${c}"><div class="flagpole"></div><div class="info">${a.label}<small>${size}</small></div></div>` }) })
      .addTo(App.gArmies);
  }
}

function renderPulse(e) {
  App.gPulse.clearLayers();
  L.marker(llOf(e.place), { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div class="ev-pulse"></div>' }) })
    .addTo(App.gPulse);
}

function renderEventCard(e) {
  const card = document.getElementById('eventCard');
  card.classList.remove('hidden');
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  card.innerHTML = `
    <div class="ec-head"><h2>${e.title}</h2><span class="ec-date">${e.date} · ${PLACES[e.place].name}</span>
      <button class="btn collapse" id="ecMin" title="접기/펼치기">${card.classList.contains('min') ? '펼치기' : '접기'}</button></div>
    <p>${e.desc}</p>
    <div class="ec-actions">${e.battle ? '<button class="btn primary" id="ecBattle">⚔ 전투 전개 보기</button>' : ''}</div>`;
  document.getElementById('ecMin').onclick = () => {
    card.classList.toggle('min');
    document.getElementById('ecMin').textContent = card.classList.contains('min') ? '펼치기' : '접기';
  };
  if (e.battle) document.getElementById('ecBattle').onclick = () => startBattle(e);
}

function statRow(label, val, max, prev, unit = '', c) {
  const pct = max ? Math.min(100, (val / max) * 100) : 0;
  let d = '';
  if (prev !== undefined && prev !== val) {
    const diff = val - prev;
    d = `<span class="delta ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'}</span>`;
  }
  return `<div class="stat"><span class="lbl">${label}</span><div class="bar"><div style="width:${pct}%;${c ? `background:${c}` : ''}"></div></div>
    <span class="val">${fmt(val)}${unit}${d}</span></div>`;
}

function renderPanel(i) {
  const e = EVENTS[i];
  const p = i > 0 ? EVENTS[i - 1].f : null;
  const st = CONTROL[i];
  const cnt = { K: 0, J: 0 };
  for (const id in st) if (!PLACES[id].fixed) cnt[st[id]]++;
  const total = cnt.K + cnt.J;
  const pv = (k, n) => (p ? p[k][n] : undefined);
  const [jt, ju, js, jf, jm] = e.f.j;
  const [wt, ws, wf, wm] = e.f.w;
  const [mt, ms, mf, mm] = e.f.m;

  const html = `
    <h3>세력 현황 <small>${e.date}</small></h3>
    <div class="card fac" style="--c:${FACTIONS.joseon.color}">
      <div class="fac-head"><span class="fac-name"><i></i>조선</span><span class="fac-strong">${fmt(jt + ju)}<small style="font-size:11px;color:var(--muted)"> 명</small></span></div>
      ${statRow('관군', jt, MAX.j[0], pv('j', 0), '명')}
      ${statRow('의병·승병', ju, MAX.j[1], pv('j', 1), '명', FACTIONS.uibyeong.color)}
      ${statRow('함선', js, MAX.j[2], pv('j', 2), '척')}
      ${statRow('군량', jf, 100, pv('j', 3), '%')}
      ${statRow('사기', jm, 100, pv('j', 4), '%')}
      ${statRow('지배 거점', cnt.K, total, undefined, `/${total}`)}
      <div class="cmd"><b>지휘</b> ${e.c.j || '—'}</div>
      ${e.n.j ? `<div class="note">● ${e.n.j}</div>` : ''}
    </div>
    <div class="card fac" style="--c:${FACTIONS.japan.color}">
      <div class="fac-head"><span class="fac-name"><i></i>일본</span><span class="fac-strong">${fmt(wt)}<small style="font-size:11px;color:var(--muted)"> 명</small></span></div>
      ${statRow('병력', wt, MAX.w[0], pv('w', 0), '명')}
      ${statRow('함선', ws, MAX.w[1], pv('w', 1), '척')}
      ${statRow('군량', wf, 100, pv('w', 2), '%')}
      ${statRow('사기', wm, 100, pv('w', 3), '%')}
      ${statRow('점령 거점', cnt.J, total, undefined, `/${total}`)}
      <div class="cmd"><b>지휘</b> ${e.c.w || '—'}</div>
      ${e.n.w ? `<div class="note">● ${e.n.w}</div>` : ''}
    </div>
    <div class="card fac" style="--c:${FACTIONS.ming.color}${mt ? '' : ';opacity:.55'}">
      <div class="fac-head"><span class="fac-name"><i></i>명</span><span class="fac-strong">${mt ? fmt(mt) + '<small style="font-size:11px;color:var(--muted)"> 명</small>' : '미참전'}</span></div>
      ${statRow('병력', mt, MAX.m[0], pv('m', 0), '명')}
      ${ms || (p && p.m[1]) ? statRow('함선', ms, MAX.m[1], pv('m', 1), '척') : ''}
      ${statRow('군량', mf, 100, pv('m', 2), '%')}
      ${statRow('사기', mm, 100, pv('m', 3), '%')}
      <div class="cmd"><b>지휘</b> ${e.c.m || '—'}</div>
      ${e.n.m ? `<div class="note">● ${e.n.m}</div>` : ''}
    </div>
    <h3>역사적 의의</h3>
    <div class="card meaning">${e.meaning}</div>
    <p class="disclaimer">※ 날짜는 음력 기준입니다. 병력·함선·군량·사기 수치는 사료와 연구마다 차이가 큰 추정치를 교육용으로 단순화한 값입니다. 지도의 세력 범위는 주요 고을 기준의 개략적인 표시입니다.</p>`;
  document.getElementById('panel').innerHTML = html;
}

// ── 전투 모드 전환
function startBattle(e) {
  stopAuto();
  App.mode = 'battle';
  for (const g of ['gZones', 'gLabels', 'gRoutes', 'gArmies', 'gPulse']) App.map.removeLayer(App[g]);
  document.getElementById('eventCard').classList.add('hidden');
  document.getElementById('mapLegend').classList.add('hidden');
  document.getElementById('map').classList.add('battle');
  const b = BATTLES[e.battle];
  b.past = PAST_TERRAIN[e.battle];
  Battle.start(b, App.map, endBattle);
  Terrain.show(b.past);
}

function restoreStrategic() {
  App.mode = 'strategic';
  Terrain.hide();
  for (const g of ['gZones', 'gLabels', 'gRoutes', 'gArmies', 'gPulse']) App[g].addTo(App.map);
  document.getElementById('mapLegend').classList.remove('hidden');
  document.getElementById('map').classList.remove('battle');
}

function endBattle() {
  restoreStrategic();
  const i = App.idx;
  App.idx = -1;
  select(i);
}

// ── 연대기 자동 재생
function stopAuto() {
  if (!App.autoTimer) return;
  clearInterval(App.autoTimer);
  App.autoTimer = null;
  const b = document.getElementById('btnAuto');
  b.textContent = '▶ 연대기 재생';
  b.classList.remove('on');
}
function toggleAuto() {
  if (App.autoTimer) return stopAuto();
  if (App.mode === 'battle') Battle.stop(false);
  const b = document.getElementById('btnAuto');
  b.textContent = '⏸ 재생 중지';
  b.classList.add('on');
  if (App.idx >= EVENTS.length - 1) select(0);
  App.autoTimer = setInterval(() => {
    if (App.idx >= EVENTS.length - 1) return stopAuto();
    select(App.idx + 1);
  }, 6000);
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  buildTimeline();
  document.getElementById('btnPrev').onclick = () => { stopAuto(); select(App.idx - 1); };
  document.getElementById('btnNext').onclick = () => { stopAuto(); select(App.idx + 1); };
  document.getElementById('btnAuto').onclick = toggleAuto;
  document.getElementById('terrainSwitch').onclick = (ev) => {
    const b = ev.target.closest('button');
    if (b) Terrain.setMode(b.dataset.mode);
  };
  document.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'SELECT') return;
    if (App.mode === 'battle') {
      if (ev.code === 'Space') { ev.preventDefault(); Battle.toggle(); }
      if (ev.key === 'Escape') Battle.stop(false);
      if (ev.key === 'ArrowRight') Battle.step(1);
      if (ev.key === 'ArrowLeft') Battle.step(-1);
      return;
    }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); stopAuto(); select(App.idx + 1); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); stopAuto(); select(App.idx - 1); }
  });
  select(0);
});

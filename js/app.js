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
// 사건 장소: 거점 id 또는 [위도, 경도] + placeName
const placeName = (e) => (Array.isArray(e.place) ? e.placeName : PLACES[e.place].name);

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
  const overlays = buildOverlays();
  overlays['조선 8도 (대략)'].addTo(map);
  L.control.layers({ '위성 지형': imagery, '지형도': terrain, '고지도풍 (물길·산세만)': Terrain.makeBase('tilePane') }, overlays, { position: 'topright' }).addTo(map);
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

// 전략 지도의 추가 레이어 (전투 화면에서는 CSS로 숨긴다: .ov-strategic)
function buildOverlays() {
  const icon = (html, cls = '') => L.divIcon({ className: `ov-strategic ${cls}`, iconSize: [0, 0], html });
  const mid = (pts) => pts[Math.floor(pts.length / 2)];

  const do8 = L.layerGroup();
  for (const [k, d] of Object.entries(DO8)) {
    L.polygon(d.polys, { color: '#f3e3b5', weight: 1.3, dashArray: '5 4', opacity: 0.75, fill: false, interactive: false, className: 'ov-strategic' }).addTo(do8);
    L.marker(DO8_LABELS[k], { interactive: false, keyboard: false, icon: icon(`<div class="do-label">${d.name}</div>`) }).addTo(do8);
  }

  const roads = L.layerGroup();
  for (const r of ROADS) {
    L.polyline(r.path, { color: '#d79a45', weight: 2.6, dashArray: '9 5', opacity: 0.9, interactive: false, className: 'ov-strategic' }).addTo(roads);
    L.marker(mid(r.path), { interactive: false, keyboard: false, icon: icon(`<div class="road-label">${r.name}</div>`) }).addTo(roads);
  }

  const waeseong = L.layerGroup();
  for (const w of WAESEONG) {
    L.marker(w.ll, { keyboard: false, icon: icon('<div class="wae-mark">倭</div>') })
      .bindTooltip(`<b>${w.name}</b><br>${w.note}`, { direction: 'top', offset: [0, -10] }).addTo(waeseong);
  }

  const navy = L.layerGroup();
  L.polyline(NAVY_HQ.map((h) => h.ll), { color: '#60a5fa', weight: 2.5, dashArray: '6 6', opacity: 0.9, interactive: false, className: 'ov-strategic route-line' }).addTo(navy);
  NAVY_HQ.forEach((h, i) => {
    L.marker(h.ll, { keyboard: false, icon: icon(`<div class="hq-mark">${i + 1}</div>`) })
      .bindTooltip(`<b>${i + 1}. ${h.name}</b> (${h.when})<br>${h.note}`, { direction: 'top', offset: [0, -10] }).addTo(navy);
  });

  const uib = L.layerGroup();
  for (const u of UIBYEONG_AREAS) {
    L.marker(u.ll, { keyboard: false, icon: icon(`<div class="uib-mark"><i></i>${u.name}</div>`) })
      .bindTooltip(`<b>${u.name}</b><br>${u.area}`, { direction: 'top', offset: [0, -8] }).addTo(uib);
  }

  return { '조선 8도 (대략)': do8, '조선의 큰길': roads, '남해안 왜성': waeseong, '수군 본영의 이동': navy, '의병 활동 지역': uib };
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
      <div class="ev-date">${e.date}${e.solar ? ` <small>· 양력 ${e.solar}</small>` : ''}</div>
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
  setHash(`#${e.id}`);

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
    <div class="ec-head"><h2>${e.title}</h2><span class="ec-date">${e.date}${e.solar ? ` (양력 ${e.solar})` : ''} · ${placeName(e)}</span>
      <button class="btn collapse" id="ecMin" title="접기/펼치기">${card.classList.contains('min') ? '펼치기' : '접기'}</button></div>
    <p>${markTerms(e.desc)}</p>
    <div class="ec-actions"><button class="btn" id="ecLink" title="이 사건을 바로 여는 주소를 복사">🔗 링크 복사</button>${e.battle ? '<button class="btn primary" id="ecBattle">⚔ 전투 전개 보기</button>' : ''}${
      ['e33', 'postwar'].includes(e.id) ? '<button class="btn primary" id="ecResults">📜 전쟁의 결과 보기</button>' : ''}</div>`;
  document.getElementById('ecResults')?.addEventListener('click', showResults);
  document.getElementById('ecLink').onclick = () => copyLink(`#${e.id}`);
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
      <div class="cmd"><b>지휘</b> ${linkNames(e.c.j) || '—'}</div>
      ${e.n.j ? `<div class="note">● ${e.n.j}</div>` : ''}
    </div>
    <div class="card fac" style="--c:${FACTIONS.japan.color}">
      <div class="fac-head"><span class="fac-name"><i></i>일본</span><span class="fac-strong">${fmt(wt)}<small style="font-size:11px;color:var(--muted)"> 명</small></span></div>
      ${statRow('병력', wt, MAX.w[0], pv('w', 0), '명')}
      ${statRow('함선', ws, MAX.w[1], pv('w', 1), '척')}
      ${statRow('군량', wf, 100, pv('w', 2), '%')}
      ${statRow('사기', wm, 100, pv('w', 3), '%')}
      ${statRow('점령 거점', cnt.J, total, undefined, `/${total}`)}
      <div class="cmd"><b>지휘</b> ${linkNames(e.c.w) || '—'}</div>
      ${e.n.w ? `<div class="note">● ${e.n.w}</div>` : ''}
    </div>
    <div class="card fac" style="--c:${FACTIONS.ming.color}${mt ? '' : ';opacity:.55'}">
      <div class="fac-head"><span class="fac-name"><i></i>명</span><span class="fac-strong">${mt ? fmt(mt) + '<small style="font-size:11px;color:var(--muted)"> 명</small>' : '미참전'}</span></div>
      ${statRow('병력', mt, MAX.m[0], pv('m', 0), '명')}
      ${ms || (p && p.m[1]) ? statRow('함선', ms, MAX.m[1], pv('m', 1), '척') : ''}
      ${statRow('군량', mf, 100, pv('m', 2), '%')}
      ${statRow('사기', mm, 100, pv('m', 3), '%')}
      <div class="cmd"><b>지휘</b> ${linkNames(e.c.m) || '—'}</div>
      ${e.n.m ? `<div class="note">● ${e.n.m}</div>` : ''}
    </div>
    <h3>역사적 의의</h3>
    <div class="card meaning">${markTerms(e.meaning)}</div>
    ${sourcesCard(e)}
    <p class="disclaimer">※ 날짜는 음력 기준입니다. 병력·함선·군량·사기 수치는 사료와 연구마다 차이가 큰 추정치를 교육용으로 단순화한 값입니다. 지도의 세력 범위는 주요 고을 기준의 개략적인 표시입니다.</p>`;
  document.getElementById('panel').innerHTML = html;
}

// ── 근거 자료
function sourcesCard(e) {
  if (!e.src?.length && !e.range) return '';
  const chips = (e.src || []).map((t) => {
    const s = findSource(t);
    return s ? `<button class="src-chip" data-src="${s.key}" title="${s.title}">${t}</button>` : `<span class="src-chip plain">${t}</span>`;
  }).join('');
  return `<h3>근거 자료 <small>사료를 누르면 설명이 열립니다</small></h3>
    <div class="card sources"><div class="src-chips">${chips}</div>
    ${e.range ? `<div class="range"><b>수치 범위</b> ${e.range}</div>` : ''}</div>`;
}

// ── 인물 사전
const SIDE_NAME = { joseon: '조선', uibyeong: '의병·승병', ming: '명', japan: '일본' };
// 긴 이름부터 연결해야 '가토 요시아키'가 '가토'(가토 기요마사)로 잘못 연결되지 않는다
const ALIAS = PEOPLE.flatMap((p) => p.alias.map((a) => ({ a, id: p.id }))).sort((x, y) => y.a.length - x.a.length);

function linkNames(text) {
  if (!text) return text || '';
  const slots = [];
  let s = String(text);
  for (const { a, id } of ALIAS) {
    if (!s.includes(a)) continue;
    s = s.split(a).join(`\u0001${slots.length}\u0002`);
    slots.push(`<button class="person-link" data-p="${id}">${a}</button>`);
  }
  return s.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[+i]);
}

// 인물 → 관련 사건 (사건 설명·지휘관·전투 부대의 지휘관 이름에서 찾는다)
const PERSON_EVENTS = (() => {
  const map = {};
  EVENTS.forEach((e, i) => {
    const parts = [e.title, e.desc, e.c?.j, e.c?.w, e.c?.m];
    if (e.battle && BATTLES[e.battle]) for (const u of Object.values(BATTLES[e.battle].units)) parts.push(u.cmd);
    for (const m of linkNames(parts.filter(Boolean).join(' / ')).matchAll(/data-p="([^"]+)"/g)) (map[m[1]] ||= new Set()).add(i);
  });
  return map;
})();

function buildPeople() {
  const q = document.getElementById('peopleSearch').value.trim();
  const html = ['joseon', 'uibyeong', 'ming', 'japan'].map((g) => {
    const list = PEOPLE.filter((p) => p.side === g && (!q || [p.name, p.hanja, p.role, ...p.alias].join(' ').includes(q)));
    if (!list.length) return '';
    return `<div class="item-group"><i style="background:${FACTIONS[g].color}"></i>${SIDE_NAME[g]} <small>${list.length}</small></div>` +
      list.map((p) => `<button class="item" data-p="${p.id}"><div class="in">${p.name}<small>${p.hanja}</small></div><div class="ir">${p.role} · ${p.life}</div></button>`).join('');
  }).join('');
  document.getElementById('peopleList').innerHTML = html || '<p style="padding:14px;color:var(--muted)">찾는 인물이 없습니다.</p>';
}

function relatedEventsHtml(indexes) {
  if (!indexes.length) return '';
  return `<h3>관련 사건 (${indexes.length})</h3><div class="rel-list">${indexes.map((i) =>
    `<button data-ev="${i}"><span>${EVENTS[i].date}</span>${EVENTS[i].title}</button>`).join('')}</div>`;
}

function showPerson(id) {
  const p = PEOPLE.find((x) => x.id === id);
  if (!p) return;
  const rel = [...(PERSON_EVENTS[id] || [])].sort((a, b) => a - b);
  openModal(p.name, `
    <div class="p-head" style="--c:${FACTIONS[p.side].color}"><div class="p-seal">${p.name[0]}</div>
      <div><div style="font-family:var(--serif);font-size:18px;font-weight:700">${p.name} <small style="color:var(--muted)">${p.hanja}</small></div>
      <div class="p-meta"><b>${FACTIONS[p.side].name}</b> · ${p.life} · ${p.role}</div></div></div>
    <p>${p.text}</p>
    ${relatedEventsHtml(rel)}`);
}

// ── 무기·전술 도감
function buildCodex() {
  document.getElementById('codexList').innerHTML = Object.entries(CODEX_CATS).map(([cat, name]) => {
    const list = CODEX.filter((c) => c.cat === cat);
    return `<div class="item-group">${name} <small>${list.length}</small></div>` + list.map((c) =>
      `<button class="item cx" data-cx="${c.id}"><span class="cx-thumb">${c.svg}</span>
        <span><div class="in">${c.name}<small>${c.hanja}</small></div><div class="ir">${FACTIONS[c.side].name}</div></span></button>`).join('');
  }).join('');
}

function showCodex(id) {
  const c = CODEX.find((x) => x.id === id);
  if (!c) return;
  const evs = c.battles.map((b) => EVENTS.findIndex((e) => e.battle === b)).filter((i) => i >= 0).sort((a, b) => a - b);
  openModal(c.name, `
    <div class="cx-big">${c.svg}</div>
    <div class="p-meta" style="margin-bottom:6px"><b>${CODEX_CATS[c.cat]}</b> · ${FACTIONS[c.side].name} · ${c.hanja}</div>
    <p>${c.text}</p>
    <ul class="cx-facts">${c.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
    ${evs.length ? `<h3>이 무기·전술이 쓰인 전투</h3><div class="rel-list">${evs.map((i) =>
      `<button data-ev="${i}" data-play="1"><span>${EVENTS[i].date}</span>⚔ ${EVENTS[i].title}</button>`).join('')}</div>` : ''}
    <p class="disclaimer" style="margin-top:12px">※ 그림은 이해를 돕기 위한 단순한 모형으로, 실제 모습과 다를 수 있습니다.</p>`);
}

function setTab(tab) {
  document.querySelectorAll('#sideTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.side-pane').forEach((p) => p.classList.toggle('hidden', p.id !== `pane-${tab}`));
}

// ── 전쟁의 결과
function showResults() {
  const R = RESULTS;
  const max = Math.max(...R.land.map((d) => d.value));
  openModal('전쟁의 결과', `
    <p>7년에 걸친 전쟁은 조선뿐 아니라 일본과 명, 동아시아 전체를 바꾸어 놓았다.</p>
    <h3>숫자로 보는 피해 — 나라가 파악한 토지(전결)</h3>
    <div class="res-chart">${R.land.map((d) => `<div class="res-row"><span>${d.label}</span>
      <div class="bar"><div style="width:${(d.value / max) * 100}%;background:var(--gold)"></div></div><b>${d.text}</b></div>`).join('')}</div>
    <p class="disclaimer">${R.landNote}</p>
    <ul class="cx-facts">${R.damage.map((t) => `<li>${t}</li>`).join('')}</ul>
    <h3>나라별로 달라진 것</h3>
    <div class="res-cards">${R.countries.map((c) => `<div class="card fac" style="--c:${FACTIONS[c.side].color}">
      <div class="fac-name"><i></i>${c.title}</div><ul class="cx-facts">${c.items.map((t) => `<li>${t}</li>`).join('')}</ul></div>`).join('')}</div>
    <h3>사라진 문화유산</h3>
    <div class="res-cards">${R.heritage.map((h) => `<div class="card"><b>${h.name}</b><p style="margin:4px 0 0">${h.text}</p></div>`).join('')}</div>
    <h3>전쟁 뒤에 이어진 일</h3>
    <div class="res-after">${R.after.map(([y, t]) => `<div><span>${y}</span>${t}</div>`).join('')}</div>
    <p class="disclaimer" style="margin-top:12px">근거: ${R.src.join(' · ')}</p>`);
}

// ── 창 (모달)
function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalBody').scrollTop = 0;
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function showSources(key) {
  openModal('참고 자료 · 사료 안내', `
    <p>이 프로그램의 사건 설명과 수치는 아래 사료와 연구에 기록된 내용을 바탕으로 교육용으로 다시 정리한 것입니다.
    사료마다 쓴 사람의 처지와 시각이 다르고 숫자도 서로 다를 때가 많으니, 여러 기록을 견주어 읽어 보세요.</p>
    ${SOURCES.map((s) => `<div class="src-item" data-key="${s.key}">
      <div class="st">${s.title}</div><div class="sm">${s.kind} · ${s.who} · ${s.when}</div><p>${s.desc}</p></div>`).join('')}`);
  if (key) {
    const el = document.querySelector(`.src-item[data-key="${key}"]`);
    if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); }
  }
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
  b.why = WHY[e.battle];
  b.link = `#${e.id}/battle`;
  Battle.start(b, App.map, endBattle);
  Terrain.show(b.past);
  setHash(b.link);
}

// ── 공유 링크: 주소 끝 #사건id (전투는 #사건id/battle)
function setHash(h) {
  try { history.replaceState(null, '', h); } catch (e) { /* file:// 등에서는 무시 */ }
}
function openFromHash() {
  const [id, mode] = decodeURIComponent(location.hash.slice(1)).split('/');
  const i = EVENTS.findIndex((e) => e.id === id);
  if (i < 0) return false;
  select(i, { playBattle: mode === 'battle' });
  return true;
}
function copyLink(hash) {
  const url = location.href.split('#')[0] + hash;
  const done = () => toast('링크를 복사했습니다. 수업 자료에 붙여 넣으세요.');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt('아래 주소를 복사하세요', url));
  else window.prompt('아래 주소를 복사하세요', url);
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── 용어 풀이
const TERMS = GLOSSARY.filter((g) => g.auto !== false).sort((a, b) => b.t.length - a.t.length);
function markTerms(text) {
  if (!text) return '';
  const slots = [];
  let s = String(text);
  for (const g of TERMS) {
    const i = s.indexOf(g.t);
    if (i < 0) continue;
    s = s.slice(0, i) + `\u0003${slots.length}\u0004` + s.slice(i + g.t.length);
    slots.push(`<span class="term${g.codex ? ' cx-term' : ''}" data-term="${g.t}">${g.t}</span>`);
  }
  return s.replace(/\u0003(\d+)\u0004/g, (_, k) => slots[+k]);
}
function buildGlossary() {
  const q = document.getElementById('glossSearch').value.trim();
  const list = [...GLOSSARY].sort((a, b) => a.t.localeCompare(b.t, 'ko'))
    .filter((g) => !q || (g.t + g.h + g.d).includes(q));
  document.getElementById('glossList').innerHTML = list.map((g) => `<div class="gloss">
    <div class="gt">${g.t} <small>${g.h}</small>${g.codex ? ` <button class="mini" data-cx-open="${g.codex}">도감 보기</button>` : ''}</div>
    <div class="gd">${g.d}</div></div>`).join('') || '<p style="padding:14px;color:var(--muted)">찾는 용어가 없습니다.</p>';
}
function initTermTip() {
  const tip = document.getElementById('termTip');
  const show = (el) => {
    const g = GLOSSARY.find((x) => x.t === el.dataset.term);
    if (!g) return;
    tip.innerHTML = `<b>${g.t}</b> <small>${g.h}</small><div>${g.d}</div>${g.codex ? '<em>누르면 무기·전술 도감이 열립니다</em>' : ''}`;
    tip.classList.add('show');
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8}px`;
  };
  document.addEventListener('mouseover', (ev) => { const el = ev.target.closest('.term'); if (el) show(el); });
  document.addEventListener('mouseout', (ev) => { if (ev.target.closest('.term')) tip.classList.remove('show'); });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('.term');
    if (!el) return;
    const g = GLOSSARY.find((x) => x.t === el.dataset.term);
    if (g?.codex) { tip.classList.remove('show'); if (App.mode === 'battle' && Battle.playing) Battle.toggle(); showCodex(g.codex); } else show(el);
  });
}

// ── 퀴즈
const Quiz = { list: [], k: 0, score: 0, group: 'all' };
function showQuizMenu() {
  openModal('퀴즈', `<p>묶음을 골라 5문제를 풀어 보세요. 문제마다 해설과 관련 사건 바로가기가 나옵니다.</p>
    <div class="quiz-groups">${Object.entries(QUIZ_GROUPS).map(([g, name]) => {
      const n = g === 'all' ? QUIZ.length : QUIZ.filter((q) => q.g === g).length;
      return `<button class="btn" data-quiz="${g}">${name} <small>(${n}문제)</small></button>`;
    }).join('')}</div>`);
}
function startQuiz(group) {
  const pool = QUIZ.filter((q) => group === 'all' || q.g === group);
  Quiz.list = pool.map((q) => ({ q, r: Math.random() })).sort((a, b) => a.r - b.r).slice(0, 5).map((x) => x.q);
  Quiz.k = 0; Quiz.score = 0; Quiz.group = group;
  renderQuiz();
}
function renderQuiz(answered = null) {
  const q = Quiz.list[Quiz.k];
  const body = document.getElementById('modalBody');
  if (!q) {
    openModal('퀴즈 결과', `<div class="quiz-score">${Quiz.list.length}문제 가운데 <b>${Quiz.score}</b>문제를 맞혔습니다.</div>
      <div class="quiz-groups"><button class="btn primary" data-quiz="${Quiz.group}">다시 풀기</button><button class="btn" data-quiz-menu="1">다른 묶음 고르기</button></div>`);
    return;
  }
  const ev = q.ev ? EVENTS.findIndex((e) => e.id === q.ev) : -1;
  document.getElementById('modalTitle').textContent = `퀴즈 ${Quiz.k + 1} / ${Quiz.list.length}`;
  body.innerHTML = `<div class="quiz-q">${q.q}</div>
    <div class="quiz-choices">${q.c.map((c, i) => {
      let cls = '';
      if (answered !== null) cls = i === q.a ? 'right' : i === answered ? 'wrong' : 'dim';
      return `<button class="quiz-c ${cls}" data-choice="${i}" ${answered !== null ? 'disabled' : ''}>${i + 1}. ${c}</button>`;
    }).join('')}</div>
    ${answered !== null ? `<div class="quiz-x ${answered === q.a ? 'ok' : 'no'}"><b>${answered === q.a ? '정답입니다!' : `아쉬워요. 정답은 ${q.a + 1}번입니다.`}</b><p>${q.x}</p>
      <div class="quiz-groups">${ev >= 0 ? `<button class="btn" data-quiz-ev="${ev}">관련 사건 보기</button>` : ''}<button class="btn primary" data-quiz-next="1">${Quiz.k + 1 < Quiz.list.length ? '다음 문제 ▶' : '결과 보기'}</button></div></div>` : ''}`;
}
function initQuiz() {
  document.getElementById('modalBody').addEventListener('click', (ev) => {
    const g = ev.target.closest('[data-quiz]');
    if (g) { startQuiz(g.dataset.quiz); return; }
    if (ev.target.closest('[data-quiz-menu]')) { showQuizMenu(); return; }
    const c = ev.target.closest('[data-choice]');
    if (c && !c.disabled) {
      const a = +c.dataset.choice;
      if (a === Quiz.list[Quiz.k].a) Quiz.score++;
      renderQuiz(a);
      return;
    }
    if (ev.target.closest('[data-quiz-next]')) { Quiz.k++; renderQuiz(); return; }
    const e = ev.target.closest('[data-quiz-ev]');
    if (e) { closeModal(); stopAuto(); setTab('timeline'); select(+e.dataset.quizEv); }
    const cx = ev.target.closest('[data-cx-open]');
    if (cx) showCodex(cx.dataset.cxOpen);
  });
}

// ── 소개
function showIntro() {
  openModal('임진왜란 · 정유재란 (1592 ~ 1598)', INTRO_HTML);
  try { localStorage.setItem('imjin_intro_seen', '1'); } catch (e) { /* 저장소를 못 쓰면 무시 */ }
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
  document.getElementById('btnSources').onclick = () => showSources();
  document.getElementById('btnResults').onclick = showResults;
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal') closeModal(); });
  document.getElementById('panel').addEventListener('click', (ev) => {
    const chip = ev.target.closest('.src-chip[data-src]');
    if (chip) showSources(chip.dataset.src);
  });
  // 인물 이름·관련 사건 버튼 (패널, 창, 왼쪽 목록 어디서든)
  document.addEventListener('click', (ev) => {
    const p = ev.target.closest('.person-link, #peopleList .item[data-p]');
    if (p) { showPerson(p.dataset.p); return; }
    const cx = ev.target.closest('#codexList .item[data-cx], .u-ico[data-codex]');
    if (cx) { if (App.mode === 'battle' && Battle.playing) Battle.toggle(); showCodex(cx.dataset.cx || cx.dataset.codex); return; }
    const rel = ev.target.closest('.rel-list button[data-ev]');
    if (rel) { closeModal(); stopAuto(); setTab('timeline'); select(+rel.dataset.ev, { playBattle: !!rel.dataset.play }); }
  });
  document.getElementById('sideTabs').onclick = (ev) => {
    const b = ev.target.closest('button[data-tab]');
    if (b) setTab(b.dataset.tab);
  };
  document.getElementById('peopleSearch').addEventListener('input', buildPeople);
  buildPeople();
  buildCodex();
  document.getElementById('terrainSwitch').onclick = (ev) => {
    const b = ev.target.closest('button');
    if (b) Terrain.setMode(b.dataset.mode);
  };
  document.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'SELECT') return;
    if (!document.getElementById('modal').classList.contains('hidden')) {
      if (ev.key === 'Escape') closeModal();
      return;
    }
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

  // 수업용 기능
  document.getElementById('btnQuiz').onclick = showQuizMenu;
  document.getElementById('btnIntro').onclick = showIntro;
  document.getElementById('bLink').onclick = () => copyLink(location.hash || '');
  document.getElementById('glossSearch').addEventListener('input', buildGlossary);
  document.addEventListener('click', (ev) => {
    const cx = ev.target.closest('[data-cx-open]');
    if (cx) showCodex(cx.dataset.cxOpen);
  });
  buildGlossary();
  initTermTip();
  initQuiz();
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).split('/')[0];
    if (EVENTS[App.idx]?.id !== id || location.hash.endsWith('/battle') !== (App.mode === 'battle')) openFromHash();
  });

  if (!openFromHash()) {
    select(0);
    let seen = false;
    try { seen = localStorage.getItem('imjin_intro_seen') === '1'; } catch (e) { /* 저장소를 못 쓰면 매번 보여 줌 */ }
    if (!seen) showIntro();
  }
});

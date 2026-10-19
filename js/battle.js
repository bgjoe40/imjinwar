// 전투 재생 엔진: 단계(phase)별 유닛 상태를 보간해 게임처럼 전개를 보여 준다.
const Battle = (() => {
  const FIRE_STYLE = {
    arrow:  { color: '#f1f5f9', weight: 1.6, cls: 'fire-arrow', boom: 'small' },
    gun:    { color: '#ffd27a', weight: 1.6, cls: 'fire-gun', boom: 'small' },
    cannon: { color: '#ff8a3d', weight: 3, cls: 'fire-cannon', boom: '' },
    fire:   { color: '#ff5a1f', weight: 2.6, cls: 'fire-fire', boom: '' },
    melee:  { color: '#ffffff', weight: 2.2, cls: 'fire-melee', boom: 'smoke' },
  };

  let B, map, onExit, layer, fxLayer;
  let ids = [], markers = {}, states = [], starts = [], total = 0;
  let t = 0, playing = false, speed = 1, raf = 0, lastTs = 0, curPhase = -1, ended = false;
  let fireLines = [], movePaths = [], lastBoom = 0, lastPanel = 0, naval = false;
  let current = {};

  const $ = (id) => document.getElementById(id);
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');

  // ── 유닛 아이콘 (SVG)
  function svgIcon(u) {
    const c = FACTIONS[u.f].color;
    const S = (body) => `<svg class="ico" viewBox="0 0 40 40">${body}</svg>`;
    const ship = (sail) => `<path d="M3 23 L37 23 L31 32 L9 32 Z" fill="${c}" stroke="#000" stroke-width="1.2"/>
      <rect x="9" y="19" width="22" height="4" fill="#3b2f22" stroke="#000" stroke-width=".8"/>
      <path d="M20 5 L20 19" stroke="#ddd" stroke-width="1.4"/>${sail}`;
    switch (u.t) {
      case 'ship':
        return S(ship(`<path d="M21 6 L31 17 L21 17 Z" fill="#f2ead8" stroke="#000" stroke-width=".6"/>`));
      case 'flag':
        if (naval) return S(ship(`<path d="M21 4 L33 8 L21 12 Z" fill="${c}" stroke="#fff" stroke-width=".8"/><circle cx="20" cy="4" r="2" fill="#ffd166"/>`));
        return S(`<rect x="7" y="18" width="26" height="15" rx="2" fill="${c}" stroke="#000" stroke-width="1.2"/>
          <path d="M20 3 L20 18" stroke="#eee" stroke-width="1.8"/><path d="M21 3 L34 7.5 L21 12 Z" fill="${c}" stroke="#fff" stroke-width=".8"/>
          <circle cx="20" cy="3" r="2" fill="#ffd166"/><path d="M12 25 h16" stroke="#fff" stroke-width="2"/>`);
      case 'turtle':
        return S(`<ellipse cx="20" cy="24" rx="16" ry="8" fill="#5a4a32" stroke="#000" stroke-width="1.2"/>
          <ellipse cx="20" cy="21" rx="13" ry="7" fill="${c}" stroke="#000" stroke-width="1"/>
          <path d="M10 20 l3 -2 l3 2 l3 -2 l3 2 l3 -2 l3 2 l3 -2" stroke="#ddd" stroke-width="1" fill="none"/>
          <path d="M33 20 q5 -3 4 3 l-3 0 z" fill="#c2410c" stroke="#000" stroke-width=".8"/>`);
      case 'cav':
        return S(`<rect x="5" y="12" width="30" height="18" rx="2" fill="${c}" stroke="#000" stroke-width="1.2"/>
          <path d="M5 30 L35 12" stroke="#fff" stroke-width="2"/><path d="M5 12 L35 30" stroke="#fff" stroke-width="2"/>`);
      case 'arq':
        return S(`<rect x="5" y="12" width="30" height="18" rx="2" fill="${c}" stroke="#000" stroke-width="1.2"/>
          <circle cx="13" cy="21" r="2.4" fill="#fff"/><circle cx="20" cy="21" r="2.4" fill="#fff"/><circle cx="27" cy="21" r="2.4" fill="#fff"/>`);
      case 'gun':
        return S(`<rect x="5" y="14" width="22" height="9" rx="4" fill="#2b2b2b" stroke="${c}" stroke-width="2"/>
          <rect x="25" y="15.5" width="9" height="6" fill="#2b2b2b" stroke="${c}" stroke-width="1.5"/>
          <circle cx="12" cy="28" r="5" fill="${c}" stroke="#000" stroke-width="1.2"/><circle cx="12" cy="28" r="1.5" fill="#000"/>`);
      case 'castle':
        return S(`<path d="M4 34 L4 14 L9 14 L9 18 L14 18 L14 14 L19 14 L19 18 L21 18 L21 14 L26 14 L26 18 L31 18 L31 14 L36 14 L36 34 Z"
          fill="#8b7d68" stroke="#000" stroke-width="1.2"/><rect x="16" y="24" width="8" height="10" rx="4" fill="#2a2016"/>
          <path d="M20 3 L20 14" stroke="#eee" stroke-width="1.5"/><path d="M21 3 L31 6.5 L21 10 Z" fill="${c}"/>`);
      default: // inf
        return S(`<rect x="5" y="12" width="30" height="18" rx="2" fill="${c}" stroke="#000" stroke-width="1.2"/>
          <path d="M9 28 L19 14 M31 28 L21 14" stroke="#fff" stroke-width="2"/>`);
    }
  }

  // ── 단계별 상태 계산
  function buildStates() {
    ids = Object.keys(B.units);
    const s0 = {};
    for (const id of ids) {
      const u = B.units[id];
      s0[id] = { lat: u.p[0], lng: u.p[1], s: u.s };
    }
    states = [s0];
    B.phases.forEach((ph, k) => {
      if (k === 0) return;
      const prev = states[k - 1], nxt = {};
      for (const id of ids) nxt[id] = { ...prev[id] };
      for (const id in ph.u || {}) {
        const [la, ln, s] = ph.u[id];
        if (la !== null) { nxt[id].lat = la; nxt[id].lng = ln; }
        if (s !== undefined) nxt[id].s = s;
      }
      states.push(nxt);
    });
    starts = [];
    total = 0;
    for (const ph of B.phases) { starts.push(total); total += ph.dur; }
  }

  function phaseAt(time) {
    for (let k = starts.length - 1; k >= 0; k--) if (time >= starts[k]) return k;
    return 0;
  }

  function computeAt(time) {
    const k = phaseAt(time);
    const local = Math.min(1, (time - starts[k]) / B.phases[k].dur);
    const out = {};
    if (k === 0) {
      for (const id of ids) out[id] = { ...states[0][id] };
      return { k, local, st: out };
    }
    const a = states[k - 1], b = states[k];
    const pm = ease(Math.min(1, local / 0.7));
    const ps = Math.min(1, local / 0.9);
    for (const id of ids) {
      out[id] = {
        lat: a[id].lat + (b[id].lat - a[id].lat) * pm,
        lng: a[id].lng + (b[id].lng - a[id].lng) * pm,
        s: a[id].s + (b[id].s - a[id].s) * ps,
      };
    }
    return { k, local, st: out };
  }

  // ── 렌더링
  function createMarkers() {
    markers = {};
    for (const id of ids) {
      const u = B.units[id];
      const big = u.t === 'flag' || u.t === 'castle';
      const html = `<div class="unit ${big ? 'big' : ''}" style="--c:${FACTIONS[u.f].color}">
        ${svgIcon(u)}${u.s ? '<div class="hp"><div></div></div>' : ''}
        <div class="tag2">${u.n}${u.s ? ` <b></b>` : ''}</div></div>`;
      const m = L.marker(u.p, { icon: L.divIcon({ className: '', html, iconSize: [0, 0] }), keyboard: false, zIndexOffset: u.t === 'castle' ? -500 : 0 })
        .addTo(layer);
      m.bindTooltip(`<b>${u.n}</b>${u.cmd ? `<br>지휘: ${u.cmd}` : ''}<br>${FACTIONS[u.f].name}`, { direction: 'top', offset: [0, -22] });
      markers[id] = m;
    }
  }

  function updateMarkers(st) {
    for (const id of ids) {
      const u = B.units[id], s = st[id], m = markers[id];
      m.setLatLng([s.lat, s.lng]);
      const el = m.getElement();
      if (!el || !u.s) continue;
      const max = maxStrength(id);
      el.querySelector('.tag2 b').textContent = fmt(s.s) + suffix(u);
      el.querySelector('.hp > div').style.width = `${Math.max(0, (s.s / max) * 100)}%`;
      el.querySelector('.unit').classList.toggle('dead', s.s < 0.5);
    }
  }

  const maxCache = {};
  function maxStrength(id) {
    if (maxCache[id] === undefined) maxCache[id] = Math.max(...states.map((s) => s[id].s), 1);
    return maxCache[id];
  }

  function clearPhaseFx() {
    fireLines.forEach((f) => layer.removeLayer(f.line));
    movePaths.forEach((p) => layer.removeLayer(p));
    fireLines = [];
    movePaths = [];
  }

  function enterPhase(k) {
    curPhase = k;
    clearPhaseFx();
    const ph = B.phases[k];
    // 이동 경로 표시
    if (k > 0) {
      for (const id of ids) {
        const a = states[k - 1][id], b = states[k][id];
        if (Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) > 0.0003) {
          movePaths.push(L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
            color: FACTIONS[B.units[id].f].color, weight: 2, opacity: 0.55, className: 'move-path', interactive: false,
          }).addTo(layer));
        }
      }
    }
    for (const [from, to, kind] of ph.fire || []) {
      const fs = FIRE_STYLE[kind] || FIRE_STYLE.gun;
      const line = L.polyline([[0, 0], [0, 0]], { color: fs.color, weight: fs.weight, opacity: 0, className: fs.cls, interactive: false }).addTo(layer);
      fireLines.push({ from, to, kind, line });
    }
    // 해설
    $('narrTime').textContent = ph.t;
    $('narrTitle').textContent = ph.title;
    $('narrStep').textContent = `${k + 1} / ${B.phases.length} 단계`;
    const tx = $('narrText');
    tx.textContent = ph.text;
    tx.classList.remove('fade'); void tx.offsetWidth; tx.classList.add('fade');
    const q = $('narrQuote');
    q.classList.toggle('hidden', !ph.quote);
    q.textContent = ph.quote || '';
    document.querySelectorAll('#phaseList li').forEach((li, i) => li.classList.toggle('cur', i === k));
  }

  function updateFire(st, local, now) {
    const active = local > 0.08 && local < 0.97;
    for (const f of fireLines) {
      const a = st[f.from], b = st[f.to];
      const alive = a.s > 0.5 || !B.units[f.from].s;
      f.line.setLatLngs([[a.lat, a.lng], [b.lat, b.lng]]);
      f.line.setStyle({ opacity: active && alive ? 0.9 : 0 });
    }
    if (!active || !fireLines.length || !playing) return;
    if (now - lastBoom < 230 / Math.sqrt(speed)) return;
    lastBoom = now;
    const f = fireLines[Math.floor(Math.random() * fireLines.length)];
    const tgt = st[f.to];
    if (st[f.from].s < 0.5 && B.units[f.from].s) return;
    const kind = FIRE_STYLE[f.kind].boom;
    const jx = (Math.random() - 0.5) * 30, jy = (Math.random() - 0.5) * 24;
    const bm = L.marker([tgt.lat, tgt.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
      html: `<div class="boom ${kind}" style="translate:${jx}px ${jy}px"></div>` }) }).addTo(fxLayer);
    setTimeout(() => fxLayer.removeLayer(bm), 1400);
    const el = markers[f.to].getElement()?.querySelector('.unit');
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  }

  // ── 오른쪽 패널
  function buildPanel() {
    const facs = [...new Set(ids.map((id) => B.units[id].f))];
    $('panel').innerHTML = `
      <h3>⚔ ${B.title} <small>${B.date}</small></h3>
      <div class="card bt-result" id="btResult">전투 진행 중…</div>
      <h3>전력 비교 <small>${naval ? '함선 수' : '병력'}</small></h3>
      <div class="card" id="btForces">${facs.map((f) => `<div class="force-row" data-f="${f}" style="--c:${FACTIONS[f].color}">
        <span><b style="color:${FACTIONS[f].color}">■</b> ${FACTIONS[f].name}</span><span class="val"></span><div class="bar"><div></div></div></div>`).join('')}</div>
      <h3>부대 현황</h3>
      <div class="card unit-list" id="btUnits">${ids.filter((id) => B.units[id].s).map((id) => {
        const u = B.units[id];
        const cx = codexFor(u, naval);
        return `<div class="unit-item" data-id="${id}" style="--c:${FACTIONS[u.f].color}"><button class="u-ico" ${cx ? `data-codex="${cx}" title="무기·전술 도감에서 보기"` : 'disabled'}>${svgIcon(u)}</button>
          <span class="u-name">${u.n}${u.cmd ? `<small>${linkNames(u.cmd)}</small>` : ''}</span><span class="val"></span></div>`;
      }).join('')}</div>
      <h3>전개 단계</h3>
      <div class="card"><ol class="phase-list" id="phaseList">${B.phases.map((p, i) => `<li data-k="${i}"><span>${p.t}</span>${p.title}</li>`).join('')}</ol></div>
      ${B.past?.note ? `<h3>당시 지형 <small>지도 왼쪽 위 [지형] 버튼으로 전환</small></h3><div class="card terrain-note">${B.past.note}</div>` : ''}
      <p class="disclaimer">※ 부대 위치와 병력 변화는 기록을 바탕으로 전개 과정을 이해하기 쉽게 재구성한 것으로, 실제 배치와 수치는 사료마다 다릅니다. 1590년대 지형은 오늘날 지도와 옛 기록을 바탕으로 한 추정입니다.</p>`;
    $('phaseList').onclick = (ev) => {
      const li = ev.target.closest('li');
      if (li) { seek(starts[+li.dataset.k] + 0.001); }
    };
  }

  const isShip = (u) => u.t === 'ship' || u.t === 'turtle' || (naval && u.t === 'flag');
  const suffix = (u) => (isShip(u) ? '척' : '');

  // 전력 합계에 넣을 부대: 해전은 함선, 육전은 병력 (nc 표시 부대는 제외)
  function counted(id) {
    const u = B.units[id];
    if (!u.s || u.nc) return false;
    return naval ? isShip(u) : !isShip(u);
  }

  function updatePanel(st) {
    const sum = {}, init = {};
    for (const id of ids) {
      if (!counted(id)) continue;
      const f = B.units[id].f;
      sum[f] = (sum[f] || 0) + st[id].s;
      init[f] = (init[f] || 0) + states[0][id].s;
    }
    const maxInit = Math.max(...Object.values(init), 1);
    document.querySelectorAll('#btForces .force-row').forEach((row) => {
      const f = row.dataset.f;
      const cur = sum[f] || 0, ini = init[f] || 0;
      const loss = ini - cur;
      row.querySelector('.val').innerHTML = `${fmt(cur)}${naval ? '척' : '명'}${loss >= 1 ? ` <span class="delta down">−${fmt(loss)}</span>` : ''}`;
      row.querySelector('.bar > div').style.width = `${(cur / maxInit) * 100}%`;
    });
    document.querySelectorAll('#btUnits .unit-item').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('.val').textContent = fmt(st[id].s) + suffix(B.units[id]);
      row.classList.toggle('dead', st[id].s < 0.5);
    });
  }

  // ── 재생 루프
  function render(now = performance.now()) {
    const { k, local, st } = computeAt(Math.min(t, total - 1e-6));
    current = st;
    if (k !== curPhase) enterPhase(k);
    updateMarkers(st);
    updateFire(st, local, now);
    if (now - lastPanel > 120) { lastPanel = now; updatePanel(st); }
    $('scrubFill').style.width = `${(t / total) * 100}%`;
    const done = t >= total;
    if (done !== ended) {
      ended = done;
      $('btResult').innerHTML = done ? `<b style="color:var(--gold)">결과</b><br>${B.result}` : '전투 진행 중…';
    }
  }

  function loop(ts) {
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (playing) {
      t = Math.min(total, t + dt * speed);
      if (t >= total) setPlaying(false);
    }
    render(ts);
    raf = requestAnimationFrame(loop);
  }

  function setPlaying(v) {
    playing = v;
    $('bPlay').textContent = v ? '⏸' : '▶';
  }

  function seek(time) {
    t = Math.max(0, Math.min(total, time));
    curPhase = -1;
    render();
  }

  function step(dir) {
    const k = phaseAt(Math.min(t, total - 1e-6));
    if (dir > 0) seek(k + 1 < starts.length ? starts[k + 1] + 0.001 : total);
    else {
      const into = t - starts[k];
      seek(into > 1.2 || k === 0 ? starts[k] + 0.001 : starts[k - 1] + 0.001);
    }
  }

  function toggle() {
    if (!playing && t >= total) seek(0);
    setPlaying(!playing);
  }

  function bindControls() {
    $('bPlay').onclick = toggle;
    $('bRestart').onclick = () => { seek(0); setPlaying(true); };
    $('bPrevPh').onclick = () => step(-1);
    $('bNextPh').onclick = () => step(1);
    $('bSpeed').onchange = (e) => { speed = +e.target.value; };
    $('bExit').onclick = () => stop(false);
    $('scrub').onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      seek(((e.clientX - r.left) / r.width) * total);
    };
  }

  function start(battle, theMap, exitCb) {
    B = battle; map = theMap; onExit = exitCb;
    // 함선 부대가 지상 부대보다 많으면 해전으로 본다 (nc: 전력 합계에서 빠지는 부대)
    const us = Object.values(B.units);
    const ships = us.filter((u) => (u.t === 'ship' || u.t === 'turtle') && !u.nc).length;
    const troops = us.filter((u) => ['inf', 'cav', 'arq', 'gun'].includes(u.t)).length;
    naval = B.naval ?? ships > troops;
    for (const k in maxCache) delete maxCache[k];
    buildStates();
    layer = L.layerGroup().addTo(map);
    fxLayer = L.layerGroup().addTo(map);
    for (const [la, ln, text] of B.labels || []) {
      L.marker([la, ln], { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="battle-label">${text}</div>` }) }).addTo(layer);
    }
    createMarkers();
    buildPanel();
    $('scrubTicks').innerHTML = starts.slice(1).map((s) => `<i style="left:${(s / total) * 100}%"></i>`).join('');
    $('battleHud').classList.remove('hidden');
    const bn = $('battleBanner');
    bn.innerHTML = `${B.title}<small>${B.date}</small>`;
    bn.classList.remove('hidden');
    bindControls();
    t = 0; curPhase = -1; ended = false; lastTs = 0; speed = +$('bSpeed').value;
    // 하단 HUD에 가려지지 않도록 지도 중심을 아래로 보정
    const hud = $('battleHud').offsetHeight || 0;
    const target = map.unproject(map.project(B.center, B.zoom).add([0, hud / 2 - 20]), B.zoom);
    map.flyTo(target, B.zoom, { duration: 1.6 });
    render();
    setPlaying(false);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    map.once('moveend', () => setTimeout(() => { if (B === battle && t === 0) setPlaying(true); }, 300));
  }

  function stop(silent) {
    if (!B) return;
    cancelAnimationFrame(raf);
    setPlaying(false);
    clearPhaseFx();
    map.removeLayer(layer);
    map.removeLayer(fxLayer);
    $('battleHud').classList.add('hidden');
    $('battleBanner').classList.add('hidden');
    B = null;
    if (!silent && onExit) onExit();
  }

  return { start, stop, toggle, step, get active() { return !!B; }, get playing() { return playing; } };
})();

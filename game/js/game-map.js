// 칠년전쟁 — 전략 지도 (SVG: 바다·육지·8도·영역·강·길·고을·함대, 확대/이동, 진군 애니메이션)
const GMap = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = GD.CITIES;
  const K = 100, LNG0 = 122.9, LNG1 = 131.0, LAT0 = 32.9, LAT1 = 43.2;
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
  const Y1 = merc(LAT1);
  const P = (ll) => [(ll[1] - LNG0) * K, (Y1 - merc(ll[0])) * K];
  const W = (LNG1 - LNG0) * K, H = (Y1 - merc(LAT0)) * K;
  const SIZE_K = { 1: 0.82, 2: 1, 3: 1.22 };
  // 산줄기 장식 (대략)
  const RANGES = [
    [[38.6, 128.2], [38.2, 128.45], [37.8, 128.6], [37.4, 128.85], [37.1, 129.0], [36.7, 129.1], [36.3, 129.05]],
    [[36.95, 128.45], [36.75, 128.1], [36.45, 127.95], [36.1, 127.85], [35.8, 127.7], [35.5, 127.62], [35.3, 127.7]],
    [[40.8, 126.9], [40.4, 126.85], [40.0, 126.95], [39.6, 127.0], [39.3, 127.2]],
    [[41.9, 129.2], [41.5, 128.9], [41.1, 128.5], [40.7, 128.1], [40.4, 127.7]],
    [[38.4, 126.6], [38.5, 126.2], [38.6, 125.9]], [[38.6, 127.4], [38.2, 127.5]],
    [[35.6, 127.2], [35.4, 126.95], [35.2, 126.78]], [[36.9, 127.7], [36.65, 127.35], [36.45, 126.98]],
    [[42.0, 128.08]], [[40.0, 126.3]], [[41.3, 127.3], [41.6, 127.9]],
  ];

  let svg, vp, L = {}, handlers = {}, sel = null, selZone = null, overlay = null, scaleK = 1;
  const vb = { x: 0, y: 0, w: W, h: H };
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const d = (pts, close) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + (close ? 'Z' : '');
  // 부드러운 곡선 (Catmull-Rom)
  function smooth(pts) {
    if (pts.length < 3) return d(pts);
    let s = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      s += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return s;
  }
  const facColor = (f) => GD.FAC[f] ? GD.FAC[f].color : '#888';

  // ── 영역: 도마다 그 도의 고을끼리 보로노이로 나눈다
  function clipHalf(poly, a, b) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [b[0] - a[0], b[1] - a[1]];
    const f = (p) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k], q = poly[(k + 1) % poly.length], fp = f(p), fq = f(q);
      if (fp <= 0) out.push(p);
      if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
  function cells() {
    const byDo = {}, out = {};
    for (const id of Game.KOREA) if (!C[id].naval) (byDo[C[id].do] = byDo[C[id].do] || []).push(id);
    for (const [dk, ids] of Object.entries(byDo)) {
      const rings = DO8[dk].polys.map(r => r.map(P));
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const r of rings) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (const i of ids) {
        let cell = [[x0 - 5, y0 - 5], [x1 + 5, y0 - 5], [x1 + 5, y1 + 5], [x0 - 5, y1 + 5]];
        const pi = P(C[i].ll);
        for (const j of ids) if (j !== i) cell = clipHalf(cell, pi, P(C[j].ll));
        out[i] = cell;
      }
    }
    return out;
  }

  // ── 그리기
  function init(svgEl, h) {
    svg = svgEl; handlers = h;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const defs = el('defs', {}, svg);
    const wave = el('pattern', { id: 'gm-wave', width: 28, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M0 9 Q7 5 14 9 T28 9', fill: 'none', stroke: '#9cc3d6', 'stroke-width': 0.8, opacity: 0.18 }, wave);
    for (const [dk, v] of Object.entries(DO8)) {
      const cp = el('clipPath', { id: 'gm-cp-' + dk }, defs);
      el('path', { d: v.polys.map(r => d(r.map(P), true)).join('') }, cp);
    }
    vp = el('g', { class: 'gm-vp' }, svg);
    el('rect', { x: -400, y: -400, width: W + 800, height: H + 800, fill: '#1d3546' }, vp);
    el('rect', { x: -400, y: -400, width: W + 800, height: H + 800, fill: 'url(#gm-wave)' }, vp);
    for (const k of ['land', 'terr', 'deco', 'links', 'seas', 'cities', 'fleets', 'over', 'anim']) L[k] = el('g', { class: 'gm-' + k }, vp);
    // 육지
    el('path', { d: GGEO.land.map(r => d(r.map(P), true)).join(''), class: 'gm-landfill' }, L.land);
    // 영역 칸
    const cs = cells();
    const byDo = {};
    for (const [id, poly] of Object.entries(cs)) (byDo[C[id].do] = byDo[C[id].do] || []).push([id, poly]);
    for (const [dk, list] of Object.entries(byDo)) {
      const g = el('g', { 'clip-path': `url(#gm-cp-${dk})` }, L.terr);
      for (const [id, poly] of list) el('path', { d: d(poly, true), class: 'gm-cell', 'data-id': id }, g);
    }
    // 장식: 산·강·8도 경계·도 이름
    for (const r of RANGES) {
      const pts = r.map(P);
      const marks = [];
      for (let i = 0; i < pts.length; i++) {
        marks.push(pts[i]);
        if (pts[i + 1]) marks.push([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
      }
      for (const [x, y] of marks) el('path', { d: `M${x - 7} ${y + 4} L${x} ${y - 6} L${x + 7} ${y + 4}`, class: 'gm-mt' }, L.deco);
    }
    for (const b of GGEO.borders) el('path', { d: d(b.map(P)), class: 'gm-border' }, L.deco);
    for (const r of GGEO.rivers) el('path', { d: r.approx ? smooth(r.pts.map(P)) : d(r.pts.map(P)), class: 'gm-river' }, L.deco);
    el('path', { d: GGEO.land.map(r => d(r.map(P), true)).join(''), class: 'gm-coast' }, L.deco);
    for (const [dk, ll] of Object.entries(DO8_LABELS)) {
      const [x, y] = P(ll);
      el('text', { x, y, class: 'gm-do' }, L.deco).textContent = GD.DO[dk];
    }
    const fx = [['명(明)', [41.9, 124.4]], ['일본', [33.6, 130.55]], ['동해', [38.4, 130.2]], ['서해', [37.2, 124.6]], ['남해', [34.05, 127.4]]];
    for (const [t, ll] of fx) { const [x, y] = P(ll); el('text', { x, y, class: 'gm-region' }, L.deco).textContent = t; }
    // 길
    for (const [a, b, cost, name, kind] of GD.LINKS) {
      const pa = P(C[a].ll), pb = P(C[b].ll);
      if (kind === 'sea') {
        const mx = (pa[0] + pb[0]) / 2 + (pb[1] - pa[1]) * 0.15, my = (pa[1] + pb[1]) / 2 - (pb[0] - pa[0]) * 0.15;
        el('path', { d: `M${pa[0]} ${pa[1]} Q${mx} ${my} ${pb[0]} ${pb[1]}`, class: 'gm-link sea' }, L.links);
      } else {
        el('line', { x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], class: 'gm-link' + (cost > 1 ? ' hard' : ''), 'data-a': a, 'data-b': b }, L.links);
        if (name) el('text', { x: (pa[0] + pb[0]) / 2, y: (pa[1] + pb[1]) / 2 - 3, class: 'gm-pass' }, L.links).textContent = name;
      }
    }
    // 바다 구역
    for (const [id, z] of Object.entries(GD.SEAS)) {
      const [x, y] = P(z.ll);
      const g = el('g', { class: 'gm-sea', 'data-id': id, transform: `translate(${x} ${y})` }, L.seas);
      el('circle', { r: 30, class: 'gm-sea-hit' }, g);
      el('text', { y: -16, class: 'gm-sea-name' }, g).textContent = z.name;
      g.addEventListener('click', (e) => { e.stopPropagation(); if (!dragMoved) handlers.zone && handlers.zone(id); });
      g.addEventListener('mouseenter', (e) => handlers.hover && handlers.hover('zone', id, e));
      g.addEventListener('mouseleave', () => handlers.leave && handlers.leave());
    }
    // 고을
    for (const id of Object.keys(C)) {
      const [x, y] = P(C[id].ll);
      const g = el('g', { class: 'gm-city', 'data-id': id, transform: `translate(${x} ${y})` }, L.cities);
      g.innerHTML = cityGlyph(id);
      g.addEventListener('click', (e) => { e.stopPropagation(); if (!dragMoved) handlers.city && handlers.city(id); });
      g.addEventListener('mouseenter', (e) => handlers.hover && handlers.hover('city', id, e));
      g.addEventListener('mouseleave', () => handlers.leave && handlers.leave());
    }
    svg.addEventListener('click', () => { if (!dragMoved) handlers.none && handlers.none(); });
    bindPanZoom();
    fit();
    window.addEventListener('resize', () => applyVB());
  }

  function cityGlyph(id) {
    const b = C[id], s = SIZE_K[b.size] || 1;
    const name = b.name;
    return `<g class="gm-cs" data-s="${s}">
      <circle r="17" class="gm-halo"/>
      <circle r="12.5" class="gm-ring"/>
      <g class="gm-castle">
        <path class="gm-wall" d="M-10 6 V-2 H-7.5 V-4.5 H-4.5 V-2 H-1.5 V-4.5 H1.5 V-2 H4.5 V-4.5 H7.5 V-2 H10 V6 Z"/>
        <path class="gm-roof" d="M-6.5 -2 L0 -9 L6.5 -2 Z"/>
        <path class="gm-gate" d="M-2.2 6 V2.4 A2.2 2.2 0 0 1 2.2 2.4 V6 Z"/>
      </g>
      <text class="gm-cname" y="21">${name}</text>
      <g class="gm-chip" transform="translate(12 -12)"><rect x="-1" y="-8" rx="3" height="12" width="30"/><text x="14" y="1.5"></text></g>
      <g class="gm-badges"></g>
    </g>`;
  }

  // ── 상태 반영
  function update() {
    const S = Game.S;
    if (!S) return;
    for (const p of L.terr.querySelectorAll('.gm-cell')) {
      const o = S.cities[p.dataset.id].o;
      p.setAttribute('fill', facColor(o));
      p.dataset.o = o;
      p.classList.toggle('sel', p.dataset.id === sel);
    }
    const visible = visibleSet();
    for (const g of L.cities.querySelectorAll('.gm-city')) {
      const id = g.dataset.id, c = S.cities[id];
      g.style.setProperty('--fc', facColor(c.o));
      g.classList.toggle('sel', id === sel);
      g.classList.toggle('foreign', !!C[id].foreign);
      g.classList.toggle('capital', id === S.capital);
      const chip = g.querySelector('.gm-chip text'), rect = g.querySelector('.gm-chip rect');
      const txt = c.t <= 0 ? '0' : visible.has(id) ? Game.fmt(c.t) : '≈' + Game.fmt(Math.round(c.t / 5000) * 5000 || 1000);
      chip.textContent = txt;
      rect.setAttribute('width', Math.max(18, txt.length * 6.6 + 6));
      chip.setAttribute('x', Math.max(18, txt.length * 6.6 + 6) / 2 - 1);
      const badges = [];
      const gn = Game.gensIn(id).length;
      if (gn && (c.o === 'joseon' || visible.has(id))) badges.push(`<g transform="translate(-22 -10)"><circle r="6.5" class="gm-bd-gen"/><text y="3">${gn}</text></g>`);
      const ships = Game.totalShips(c.ships);
      if (ships) badges.push(`<g transform="translate(-22 6)"><path class="gm-bd-ship" d="M-7 -1 H7 L4 4 H-4 Z M-1 -1 V-8 L4 -3 Z"/><text x="0" y="13" class="gm-bd-n">${ships}</text></g>`);
      if (id === S.capital) badges.push('<text class="gm-crown" y="-15">♛</text>');
      if (c.o === 'japan' && !C[id].foreign && S.uib[C[id].do] >= 30) badges.push('<text class="gm-fire" x="-2" y="-14">🔥</text>');
      g.querySelector('.gm-badges').innerHTML = badges.join('');
    }
    // 함대
    L.fleets.innerHTML = '';
    const byZone = {};
    for (const f of S.fleets) (byZone[f.zone] = byZone[f.zone] || []).push(f);
    for (const [z, list] of Object.entries(byZone)) {
      const [x, y] = P(GD.SEAS[z].ll);
      list.forEach((f, i) => {
        const g = el('g', { class: 'gm-fleet', transform: `translate(${x + (i - (list.length - 1) / 2) * 26} ${y + 6})` }, L.fleets);
        g.style.setProperty('--fc', facColor(f.o));
        g.innerHTML = `<g class="gm-fs"><circle r="11" class="gm-fleet-bg"/><path class="gm-fleet-ship" d="M-8 0 H8 L5 6 H-5 Z M-1 0 V-9 L5 -3 Z"/><text y="20" class="gm-fleet-n">${Game.totalShips(f.s)}</text></g>`;
        g.classList.toggle('sel', handlers.selFleet && handlers.selFleet() === f.id);
        g.addEventListener('click', (e) => { e.stopPropagation(); if (!dragMoved) handlers.fleet && handlers.fleet(f.id); });
        g.addEventListener('mouseenter', (e) => handlers.hover && handlers.hover('fleet', f.id, e));
        g.addEventListener('mouseleave', () => handlers.leave && handlers.leave());
      });
    }
    // 바다 구역 상태: 일본 보급 뱃길
    for (const g of L.seas.querySelectorAll('.gm-sea')) {
      const id = g.dataset.id;
      const blocked = Game.shipsIn(id, 'allied') >= 3;
      const jp = id !== 's_daehan' && Game.seaOpen(id) && GD.SEA_CHAIN.includes(id);
      g.classList.toggle('blocked', blocked);
      g.classList.toggle('jpopen', jp);
      g.classList.toggle('sel', id === selZone);
    }
    rescale();
  }
  // 적 병력을 정확히 볼 수 있는 고을: 우리 땅과 그 이웃
  function visibleSet() {
    const S = Game.S, out = new Set();
    for (const id of Object.keys(S.cities)) {
      if (S.cities[id].o === 'joseon' || S.cities[id].o === 'ming') {
        out.add(id);
        for (const n of Game.neighbors(id)) out.add(n);
      }
    }
    return out;
  }

  // ── 표시 모드: 출진 목표 고르기 등
  function showReach(r, from) {
    clearOverlay();
    overlay = el('g', {}, L.over);
    const pf = P(C[from].ll);
    el('circle', { cx: pf[0], cy: pf[1], r: 20 * scaleK, class: 'gm-from' }, overlay);
    for (const [id, k] of Object.entries(r.kind)) {
      if (k === 'pass') continue;
      const [x, y] = P(C[id].ll);
      const g = el('g', { class: 'gm-target ' + k, transform: `translate(${x} ${y})`, 'data-id': id }, overlay);
      const path = Game.pathTo(r, id).map(c => P(C[c].ll)).map(([px, py]) => [px - x, py - y]);
      el('path', { d: d(path), class: 'gm-tpath' }, g);
      el('circle', { r: 19, class: 'gm-tring' }, g);
      g.addEventListener('click', (e) => { e.stopPropagation(); handlers.target && handlers.target(id); });
    }
    rescale();
  }
  function showSeaReach(r, from) {
    clearOverlay();
    overlay = el('g', {}, L.over);
    for (const id of Object.keys(r.dist)) {
      const [x, y] = P(GD.SEAS[id].ll);
      const g = el('g', { class: 'gm-target sea' + (id === from ? ' here' : ''), transform: `translate(${x} ${y})`, 'data-id': id }, overlay);
      el('circle', { r: 30, class: 'gm-tring' }, g);
      g.addEventListener('click', (e) => { e.stopPropagation(); handlers.target && handlers.target(id); });
    }
    rescale();
  }
  function clearOverlay() { if (overlay) overlay.remove(); overlay = null; }

  // ── 진군 애니메이션
  let speed = 1;
  function animate(ids, fac, kind) {
    if (!speed || !ids || ids.length < 2) return Promise.resolve();
    const pts = ids.map(i => P((C[i] || GD.SEAS[i]).ll));
    const line = el('path', { d: d(pts), class: 'gm-march ' + (kind || ''), stroke: facColor(fac) }, L.anim);
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
    const tok = el('g', { class: 'gm-token' }, L.anim);
    tok.innerHTML = `<circle r="9" fill="${facColor(fac)}"/><text y="4">${GD.FAC[fac].seal}</text>`;
    const dur = Math.min(1400, 350 + len * 2.2) / speed;
    return new Promise(res => {
      let finished = false;
      // 탭이 가려져 화면 갱신이 멈춰도 진군은 끝나도록 시간으로도 마무리한다
      const finish = () => {
        if (finished) return;
        finished = true;
        tok.remove(); line.classList.add('done'); setTimeout(() => line.remove(), 900); res();
      };
      const t0 = performance.now();
      const step = (t) => {
        if (finished) return;
        const k = Math.max(0, Math.min(1, (t - t0) / dur));
        line.style.strokeDashoffset = `${len * (1 - k)}`;
        const p = line.getPointAtLength(len * k);
        tok.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scaleK})`);
        if (k < 1) requestAnimationFrame(step);
        else setTimeout(finish, 120 / speed);
      };
      requestAnimationFrame(step);
      setTimeout(finish, dur + 400);
    });
  }
  function flash(id, kind) {
    const z = C[id] || GD.SEAS[id];
    if (!z) return;
    const [x, y] = P(z.ll);
    const c = el('circle', { cx: x, cy: y, r: 10, class: 'gm-flash ' + (kind || '') }, L.anim);
    setTimeout(() => c.remove(), 1400);
  }

  // ── 확대·이동
  let dragMoved = false;
  function unitsPerPx() {
    const r = svg.getBoundingClientRect();
    return Math.max(vb.w / Math.max(1, r.width), vb.h / Math.max(1, r.height));
  }
  function applyVB() {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    rescale();
  }
  function rescale() {
    scaleK = unitsPerPx();
    const z = W / vb.w;
    svg.classList.toggle('zoom-2', z > 1.9);
    svg.classList.toggle('zoom-3', z > 3.2);
    for (const g of svg.querySelectorAll('.gm-cs')) g.setAttribute('transform', `scale(${scaleK * g.dataset.s})`);
    for (const g of svg.querySelectorAll('.gm-fs')) g.setAttribute('transform', `scale(${scaleK})`);
    for (const g of svg.querySelectorAll('.gm-sea > circle, .gm-sea > text')) g.setAttribute('transform', `scale(${scaleK})`);
    for (const g of svg.querySelectorAll('.gm-target > *')) g.setAttribute('transform', `scale(${scaleK})`);
    for (const t of svg.querySelectorAll('.gm-target .gm-tpath')) t.setAttribute('transform', '');
    svg.style.setProperty('--k', scaleK);
  }
  function clampVB() {
    vb.w = Math.max(W / 9, Math.min(W * 1.25, vb.w));
    vb.h = vb.w * (H / W);
    vb.x = Math.max(-W * 0.3, Math.min(W * 1.3 - vb.w, vb.x));
    vb.y = Math.max(-H * 0.2, Math.min(H * 1.2 - vb.h, vb.y));
  }
  function toMap(cx, cy) {
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM().inverse();
    const q = pt.matrixTransform(m);
    return [q.x, q.y];
  }
  function zoomAt(f, cx, cy) {
    const [mx, my] = cx === undefined ? [vb.x + vb.w / 2, vb.y + vb.h / 2] : toMap(cx, cy);
    const nw = Math.max(W / 9, Math.min(W * 1.25, vb.w * f)), k = nw / vb.w;
    vb.x = mx - (mx - vb.x) * k; vb.y = my - (my - vb.y) * k; vb.w = nw; vb.h = nw * (H / W);
    clampVB(); applyVB();
  }
  function bindPanZoom() {
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    let down = null;
    const pts = new Map();
    svg.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      down = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, k: unitsPerPx(), dist: null };
      dragMoved = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (down.dist) zoomAt(down.dist / dd, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        down.dist = dd; dragMoved = true;
        return;
      }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!dragMoved && Math.hypot(dx, dy) < 5) return;
      dragMoved = true;
      svg.classList.add('dragging');
      vb.x = down.vx - dx * down.k; vb.y = down.vy - dy * down.k;
      clampVB(); applyVB();
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (!pts.size) { down = null; svg.classList.remove('dragging'); setTimeout(() => { dragMoved = false; }, 0); }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  function fit() { vb.x = 0; vb.y = 0; vb.w = W; vb.h = H; applyVB(); }
  function focus(id, zoom = 2.6) {
    const z = C[id] || GD.SEAS[id];
    if (!z) return;
    const [x, y] = P(z.ll);
    vb.w = W / zoom; vb.h = vb.w * (H / W); vb.x = x - vb.w / 2; vb.y = y - vb.h / 2;
    clampVB(); applyVB();
  }
  function focusSouth() { vb.w = W / 2.1; vb.h = vb.w * (H / W); const [x, y] = P([35.6, 127.9]); vb.x = x - vb.w / 2; vb.y = y - vb.h / 2; clampVB(); applyVB(); }

  function select(id) { sel = id; selZone = null; update(); }
  function selectZone(id) { selZone = id; sel = null; update(); }

  return {
    init, update, select, selectZone, showReach, showSeaReach, clearOverlay, animate, flash, fit, focus, focusSouth,
    zoomIn: () => zoomAt(1 / 1.3), zoomOut: () => zoomAt(1.3), P,
    set speed(v) { speed = v; }, get speed() { return speed; },
  };
})();

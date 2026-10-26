// 칠년전쟁 — 전술 전투 (육각형 칸 전장: 공성전·야전·해전, 계략, 전투 AI, 위임·즉시 결과)
const TB = (() => {
  const UT = Object.assign({}, GD.UNITS, {
    fort: { name: '포대', glyph: '砦', mp: 0, rng: 2, atk: 0, ratk: 1.0, def: 2.0, per: 1, fixed: true },
  });
  const COLS = 16, ROWS = 11, HR = 26, HW = Math.sqrt(3) * HR;
  const T = {
    plain:  { name: '평지', cost: 1, def: 1.0 },
    forest: { name: '숲', cost: 2, def: 1.2 },
    hill:   { name: '구릉', cost: 2, def: 1.15 },
    mount:  { name: '산', cost: 3, def: 1.35 },
    paddy:  { name: '논·습지', cost: 2, def: 0.9 },
    river:  { name: '강', cost: 99, def: 0.8 },
    ford:   { name: '여울', cost: 3, def: 0.75 },
    sea:    { name: '바다', cost: 99, def: 1 },
    village:{ name: '마을', cost: 1, def: 1.15 },
    wall:   { name: '성벽', cost: 1, def: 1.8, castle: true },
    gate:   { name: '성문', cost: 1, def: 1.5, castle: true },
    inner:  { name: '성안', cost: 1, def: 1.4, inside: true },
    keep:   { name: '본진', cost: 1, def: 1.7, inside: true },
    rubble: { name: '무너진 성벽', cost: 2, def: 1.1 },
    cliff:  { name: '벼랑', cost: 99, def: 1 },
    deep:   { name: '바다', cost: 1, def: 1.0, water: true },
    shoal:  { name: '얕은 바다', cost: 2, def: 1.0, water: true },
    land:   { name: '육지', cost: 99, def: 1 },
    fortx:  { name: '포대', cost: 99, def: 1 },
  };
  const WALL_DEF = { eup: { wall: 2.0, gate: 1.7 }, san: { wall: 2.3, gate: 1.9 }, wae: { wall: 2.7, gate: 2.2 } };
  const GENERIC = { joseon: '군관', japan: '아시가루 대장', ming: '유격장' };
  const ROUGH = ['forest', 'hill', 'mount', 'village'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = Math.round;
  let TB_last = null;

  // ── 육각형 칸
  const inb = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
  const NB = [[[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]], [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]]];
  const nbs = (c, r) => NB[r & 1].map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => inb(x, y));
  const cube = (c, r) => { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; };
  const hd = (c1, r1, c2, r2) => { const a = cube(c1, r1), b = cube(c2, r2); return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])); };
  const key = (c, r) => r * COLS + c;
  const px = (c, r) => [HW * (c + 0.5 * (r & 1)) + HW / 2 + 4, HR * 1.5 * r + HR + 4];
  function seeded(s) { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ── 전장 만들기
  function relSide(dir, bearing) {
    const A = { N: 0, E: 90, S: 180, W: 270 }[dir];
    const rel = ((A - bearing + 270) % 360 + 360) % 360;
    return rel >= 315 || rel < 45 ? 'T' : rel < 135 ? 'R' : rel < 225 ? 'B' : 'L';
  }
  function genLand(spec) {
    const cd = GD.CITIES[spec.city];
    const rng = seeded(hash(spec.city) ^ 0x9e3779b9);
    const g = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ t: 'plain' })));
    const set = (c, r, t) => { if (inb(c, r)) g[r][c] = { t }; };
    const from = GD.CITIES[spec.att.from] || cd;
    const lat = cd.ll[0] * Math.PI / 180;
    const bearing = (Math.atan2((from.ll[1] - cd.ll[1]) * Math.cos(lat), from.ll[0] - cd.ll[0]) * 180 / Math.PI + 360) % 360;
    const castle = spec.def.castle || 'eup', cc = 11, cr = 5;
    const reserved = (c, r) => hd(c, r, cc, cr) <= (castle === 'wae' ? 4 : 3) || c <= 2;
    function band(side, t, w) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const j = (rng() < 0.35 ? 1 : 0);
        const hit = side === 'L' ? c < w + j - (r % 3 === 0 ? 1 : 0) : side === 'R' ? c >= COLS - w - j : side === 'T' ? r < w - 1 + j : r >= ROWS - w + 1 - j;
        if (hit) set(c, r, t);
      }
    }
    let seaSide = spec.att.viaSea ? 'L' : cd.sea ? relSide(cd.sea, bearing) : null;
    if (seaSide === 'L' && !spec.att.viaSea) seaSide = 'B';
    if (seaSide) band(seaSide, 'sea', 2);
    if (cd.river) {
      let side = relSide(cd.river, bearing);
      if (side === seaSide) side = side === 'T' ? 'B' : 'T';
      const fords = new Set();
      if (side === 'L' || side === 'R') {
        const base = side === 'L' ? 6 : 14;
        while (fords.size < 3) fords.add(1 + Math.floor(rng() * (ROWS - 2)));
        let c = base;
        for (let r = 0; r < ROWS; r++) {
          if (rng() < 0.3) c = clamp(c + (rng() < 0.5 ? -1 : 1), base - 1, base + 1);
          if (g[r][c].t !== 'sea') set(c, r, fords.has(r) ? 'ford' : 'river');
        }
      } else {
        const base = side === 'T' ? 1 : 9;
        while (fords.size < 3) fords.add(3 + Math.floor(rng() * 10));
        let r = base;
        for (let c = 0; c < COLS; c++) {
          if (rng() < 0.3) r = clamp(r + (rng() < 0.5 ? -1 : 1), base - 1, base + 1);
          if (g[r][c].t !== 'sea') set(c, r, fords.has(c) ? 'ford' : 'river');
        }
      }
    }
    function blobs(t, n) {
      let tries = 0;
      while (n > 0 && tries++ < 200) {
        let c = 3 + Math.floor(rng() * (COLS - 3)), r = Math.floor(rng() * ROWS);
        if (reserved(c, r) || g[r][c].t !== 'plain') continue;
        const size = 1 + Math.floor(rng() * 3);
        for (let k = 0; k < size && n > 0; k++) {
          if (!reserved(c, r) && g[r][c].t === 'plain') { set(c, r, t); n--; }
          const nb = nbs(c, r); [c, r] = nb[Math.floor(rng() * nb.length)];
        }
      }
    }
    blobs('mount', cd.mount * 3); blobs('hill', cd.mount * 2 + 1); blobs('forest', cd.forest * 4 + 1); blobs('paddy', cd.paddy * 4);
    if (cd.river && cd.paddy) for (let r = 0; r < ROWS; r++) for (let c = 3; c < COLS; c++) {
      if (g[r][c].t === 'plain' && !reserved(c, r) && nbs(c, r).some(([x, y]) => ['river', 'ford'].includes(g[y][x].t)) && rng() < 0.45) set(c, r, 'paddy');
    }
    // 성
    const ring = (k) => { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (hd(c, r, cc, cr) === k) out.push([c, r]); return out; };
    const wallHp = (80 + spec.def.wall * 6) * (castle === 'wae' ? 2 : castle === 'san' ? 1.2 : 1);
    const ruined = spec.def.wall < 15;
    const putWall = (c, r, t) => { g[r][c] = ruined ? { t: 'rubble' } : { t, hp: R(t === 'gate' ? wallHp * 0.7 : wallHp), hpMax: R(t === 'gate' ? wallHp * 0.7 : wallHp) }; };
    const pickGate = (cells) => cells.slice().sort((a, b) => a[0] - b[0] || Math.abs(a[1] - cr) - Math.abs(b[1] - cr))[0];
    if (castle === 'san') for (const [c, r] of ring(3)) set(c, r, rng() < 0.5 ? 'mount' : 'hill');
    if (castle === 'wae') {
      const outer = ring(3), inner = ring(1);
      for (const [c, r] of ring(2)) set(c, r, 'inner');
      const og = pickGate(outer), og2 = outer.slice().sort((a, b) => b[1] - a[1])[0], ig = pickGate(inner);
      for (const [c, r] of outer) putWall(c, r, (c === og[0] && r === og[1]) || (c === og2[0] && r === og2[1]) ? 'gate' : 'wall');
      for (const [c, r] of inner) putWall(c, r, c === ig[0] && r === ig[1] ? 'gate' : 'wall');
    } else {
      const rg = ring(2), gt = pickGate(rg);
      const gt2 = rg.slice().sort((a, b) => (rng() < 0.5 ? a[1] - b[1] : b[1] - a[1]))[0];
      for (const [c, r] of rg) {
        if (castle === 'san' && c > cc + 1) { set(c, r, 'cliff'); continue; }
        putWall(c, r, (c === gt[0] && r === gt[1]) || (c === gt2[0] && r === gt2[1]) ? 'gate' : 'wall');
      }
      for (const [c, r] of ring(1)) set(c, r, 'inner');
    }
    set(cc, cr, 'keep');
    for (const [c, r] of [[cc - 4, cr - 1], [cc - 4, cr + 2], [cc - 5, cr + 1]]) if (inb(c, r) && g[r][c].t === 'plain') set(c, r, 'village');
    return { g, castle: ruined ? null : castle, keep: [cc, cr], seaSide };
  }
  function genSea(spec) {
    const tmpl = spec.harbor ? 'harbor' : GD.SEAS[spec.zone].tmpl;
    const rng = seeded(hash(spec.zone + (spec.harbor || '')));
    const g = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ t: 'deep' })));
    const set = (c, r, t, extra) => { if (inb(c, r)) g[r][c] = Object.assign({ t }, extra || {}); };
    const island = (c0, c1, size) => {
      let c = c0 + Math.floor(rng() * (c1 - c0)), r = 1 + Math.floor(rng() * (ROWS - 2));
      for (let k = 0; k < size; k++) {
        set(c, r, 'land');
        for (const [x, y] of nbs(c, r)) if (g[y][x].t === 'deep' && rng() < 0.25) set(x, y, 'shoal');
        const nb = nbs(c, r); [c, r] = nb[Math.floor(rng() * nb.length)];
      }
    };
    if (tmpl === 'open') for (let i = 0; i < 3; i++) island(4, 12, 1 + Math.floor(rng() * 3));
    if (tmpl === 'islands') for (let i = 0; i < 7; i++) island(3, 13, 1 + Math.floor(rng() * 4));
    if (tmpl === 'strait') {
      for (let c = 0; c < COLS; c++) {
        const w = c < 4 || c > 11 ? 4 : c < 6 || c > 9 ? 2 : c === 6 || c === 9 ? 1 : 0;
        for (let r = 0; r < ROWS; r++) {
          if (Math.abs(r - 5) > w) set(c, r, 'land');
          else if (c >= 4 && c <= 11) g[r][c].flow = true;
        }
      }
    }
    if (tmpl === 'channel') {
      for (let c = 0; c < COLS; c++) {
        const mid = 8 - c * 0.4, w = c < 3 || c > 12 ? 3.2 : 2.1;
        for (let r = 0; r < ROWS; r++) if (Math.abs(r - mid) > w) set(c, r, 'land');
      }
    }
    if (tmpl === 'harbor') {
      for (let r = 0; r < ROWS; r++) {
        const edge = 13 + (rng() < 0.4 ? 1 : 0) - (r >= 4 && r <= 6 ? 1 : 0);
        for (let c = edge; c < COLS; c++) set(c, r, 'land');
      }
      for (let i = 0; i < 2; i++) island(5, 10, 1 + Math.floor(rng() * 2));
    }
    return { g, castle: null, keep: null, tmpl };
  }

  // ── 부대 만들기
  function genStats(id, fac) {
    if (id && GD.GENS[id]) { const d = GD.GENS[id]; return { lea: d.lea, war: d.war, int: d.int, cha: d.cha, skills: d.skills }; }
    return { lea: 45, war: 45, int: 40, cha: 40, skills: [] };
  }
  function defaultType(id, fac, idx, troops) {
    const sk = id ? GD.GENS[id].skills : [];
    const reform = fac === 'joseon' && Game.S && Game.S.reforms.hullyeon;
    if (fac === 'joseon') {
      if (sk.includes('cav')) return 'cav';
      if (sk.includes('cannon') && troops <= 4000) return 'cannon';
      if (sk.includes('monk')) return 'monk';
      if (sk.includes('uib')) return 'uib';
      if (reform && idx % 3 === 1) return 'gun';
      return idx % 2 === 0 ? 'bow' : 'inf';
    }
    if (fac === 'japan') { if (sk.includes('gun')) return 'gun'; return ['gun', 'spear', 'gun', 'inf', 'cav'][idx % 5]; }
    if (sk.includes('cav')) return 'cav';
    return ['inf', 'cannon', 'cav', 'spear'][idx % 4];
  }
  let uid = 1;
  function makeUnit(side, fac, gen, type, n, tr, mo) {
    const st = genStats(gen, fac);
    const name = gen ? GD.GENS[gen].name : GENERIC[fac] || '장수';
    const ch = gen ? GD.GENS[gen].ch : UT[type].glyph;
    return { id: uid++, side, fac, gen, name, ch, type, n, n0: n, tr, mo, ...st, c: 0, r: 0, done: false, moved: false, cmdr: false, dead: false, rout: false, st: { conf: 0, fire: 0 }, cd: {}, fate: null };
  }
  function landUnits(sp, side) {
    const gens = (sp.gens || []).filter(g => !GD.GENS[g].skills.includes('king')).slice(0, 6)
      .sort((a, b) => GD.GENS[b].lea - GD.GENS[a].lea);
    let troops = sp.troops, out = [];
    // 부대 수: 병력 4천 명에 하나꼴, 2천5백 명이 넘으면 적어도 셋, 많아야 일곱
    const count = Math.max(Math.min(gens.length, 6), troops >= 2500 ? 3 : 1, Math.min(7, Math.ceil(troops / 4000)));
    const wts = Array.from({ length: count }, (_, i) => i < gens.length ? 1.3 + GD.GENS[gens[i]].lea / 100 : 1);
    const wsum = wts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count && troops > 0; i++) {
      const take = i === count - 1 ? troops : Math.min(troops, Math.max(100, R(sp.troops * wts[i] / wsum)));
      troops -= take;
      const g = gens[i] || null;
      out.push(makeUnit(side, sp.fac, g, (g && sp.types && sp.types[g]) || defaultType(g, sp.fac, i, take), take, sp.tr, sp.mo));
    }
    if (out.length) out.sort((a, b) => (b.gen ? GD.GENS[b.gen].lea : 0) - (a.gen ? GD.GENS[a.gen].lea : 0))[0].cmdr = true;
    return out;
  }
  function seaUnits(sp, side) {
    const gens = (sp.gens || []).slice().sort((a, b) => (GD.GENS[b].skills.includes('navy') - GD.GENS[a].skills.includes('navy')) || GD.GENS[b].lea - GD.GENS[a].lea);
    const out = [];
    let gi = 0;
    const nextGen = (pref) => {
      const i = gens.findIndex(g => !pref || GD.GENS[g].skills.includes(pref));
      if (i >= 0) return gens.splice(i, 1)[0];
      return gens.length ? gens.shift() : null;
    };
    const order = ['turtle', 'atake', 'panok', 'mship', 'seki'];
    for (const ty of order) {
      let n = sp.ships[ty] || 0;
      if (!n) continue;
      const per = ty === 'turtle' ? 3 : ty === 'seki' ? 22 : ty === 'atake' ? 6 : 10;
      const groups = Math.max(1, Math.min(4, Math.ceil(n / per)));
      for (let k = 0; k < groups; k++) {
        const take = k === groups - 1 ? n : Math.ceil(n / (groups - k));
        n -= take;
        const g = nextGen(ty === 'turtle' ? 'charge' : 'navy');
        out.push(makeUnit(side, sp.fac, g, ty, take, sp.tr, sp.mo));
        gi++;
      }
    }
    if (out.length) out.slice().sort((a, b) => (b.gen ? GD.GENS[b.gen].lea : 0) - (a.gen ? GD.GENS[a.gen].lea : 0))[0].cmdr = true;
    return out;
  }

  // ── 전투 준비
  function setup(spec) {
    uid = 1;
    const land = spec.kind === 'land';
    const map = land ? genLand(spec) : genSea(spec);
    const B = {
      spec, kind: spec.kind, grid: map.g, castle: map.castle, keep: map.keep, tmpl: map.tmpl, seaSide: map.seaSide,
      castleSide: land && map.castle ? 'D' : null, units: [], day: 1, maxDay: land ? 24 : 14, side: 'A', log: [], over: null,
      fac: { A: spec.att.fac, D: spec.def.fac }, flowDir: 1,
    };
    const A = land ? landUnits(spec.att, 'A') : seaUnits(spec.att, 'A');
    (spec.att.allies || []).forEach((al, i) => {
      const us = land ? landUnits(al, 'A') : seaUnits(al, 'A');
      for (const u of us) { u.ally = i + 1; u.cmdr = false; }
      A.push(...us);
    });
    const D = land ? landUnits(spec.def, 'D') : seaUnits(spec.def, 'D');
    if (!land && spec.harbor && (spec.def.harborFort || GD.CITIES[spec.harbor].castle)) {
      const forts = [];
      for (let r = 1; r < ROWS - 1; r += 3) {
        for (let c = COLS - 1; c >= 0; c--) {
          if (B.grid[r][c].t === 'land' && nbs(c, r).some(([x, y]) => T[B.grid[y][x].t].water)) { forts.push([c, r]); break; }
        }
      }
      for (const [c, r] of forts.slice(0, spec.def.harborFort ? 3 : 2)) {
        const u = makeUnit('D', spec.def.fac, null, 'fort', 1500, 70, 80);
        u.name = '포대'; u.ch = '砦'; u.c = c; u.r = r; u.fixed = true;
        B.grid[r][c] = { t: 'fortx' };
        D.push(u);
      }
    }
    place(B, A, 'A'); place(B, D.filter(u => !u.fixed), 'D');
    if (spec.ambush) for (const u of (spec.ambush === 'D' ? D : A)) { u.st.conf = 2; u.mo = clamp(u.mo - 25, 5, 100); }
    B.units = [...A, ...D];
    const mob = B.units.filter(u => !u.fixed);
    B.scale = Math.max(200, mob.reduce((t, u) => t + u.n * (UT[u.type].per || 1), 0) / Math.max(1, mob.length));
    if (!A.length || !D.filter(u => !u.fixed).length) B.over = { win: A.length ? 'A' : 'D', why: '맞설 군사가 없었습니다' };
    fields(B);
    return B;
  }
  function passable(B, c, r, u) {
    const h = B.grid[r][c], t = T[h.t];
    if (UT[u.type].sea) return !!t.water;
    if (t.water) return false;
    if (t.cost >= 99) return false;
    if (t.castle && u.side !== B.castleSide) return false;
    return true;
  }
  function place(B, list, side) {
    const occ = new Set(B.units.concat(list).filter(u => u.c || u.r).map(u => key(u.c, u.r)));
    const land = B.kind === 'land';
    let cands = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const probe = { type: list[0] ? list[0].type : 'inf', side };
      if (!passable(B, c, r, probe)) continue;
      let s;
      if (side === 'A') s = land ? -c * 10 - Math.abs(r - 5) * 3 - (B.seaSide === 'L' ? Math.abs(c - 3) * 20 : 0) : -c * 10 - Math.abs(r - 5) * 2;
      else if (land && B.castle) s = -hd(c, r, B.keep[0], B.keep[1]) * 10 - (T[B.grid[r][c].t].castle ? 0 : 30);
      else if (land) s = -Math.abs(c - 11) * 8 - Math.abs(r - 5) * 4;
      else s = c * 10 - Math.abs(r - 5) * 2;
      cands.push([s, c, r]);
    }
    cands.sort((a, b) => b[0] - a[0]);
    // 성을 지킬 때: 원거리 부대는 성벽, 총대장은 본진
    const sorted = list.slice().sort((a, b) => (b.cmdr - a.cmdr));
    for (const u of sorted) {
      let pick = null;
      if (side === 'D' && land && B.castle) {
        const want = u.cmdr ? ['keep', 'inner'] : UT[u.type].rng > 1 ? ['wall', 'gate', 'inner'] : ['gate', 'inner', 'wall'];
        for (const w of want) { pick = cands.find(([, c, r]) => B.grid[r][c].t === w && !occ.has(key(c, r))); if (pick) break; }
      }
      if (!pick) pick = cands.find(([, c, r]) => !occ.has(key(c, r)));
      if (!pick) { u.dead = true; continue; }
      u.c = pick[1]; u.r = pick[2]; occ.add(key(u.c, u.r));
    }
  }

  // ── 거리장: 목표까지 남은 걸음
  function field(B, sources, side) {
    const INF = 1e9, dist = new Array(COLS * ROWS).fill(INF), q = [];
    for (const [c, r] of sources) { dist[key(c, r)] = 0; q.push([0, c, r]); }
    const sea = B.kind === 'sea';
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]);
      const [d0, c, r] = q.shift();
      if (d0 > dist[key(c, r)]) continue;
      for (const [x, y] of nbs(c, r)) {
        const t = T[B.grid[y][x].t];
        let cost = sea ? (t.water ? t.cost : 99) : t.water ? 99 : t.cost;
        if (!sea && t.castle && side !== B.castleSide) cost = B.grid[y][x].t === 'gate' ? 3 : 5;
        if (cost >= 99) continue;
        const nd = d0 + cost;
        if (nd < dist[key(x, y)]) { dist[key(x, y)] = nd; q.push([nd, x, y]); }
      }
    }
    return dist;
  }
  function fields(B) {
    B.fA = B.castle ? field(B, [B.keep], 'A') : field(B, alive(B, 'D').map(u => [u.c, u.r]), 'A');
    B.fD = field(B, alive(B, 'A').map(u => [u.c, u.r]), 'D');
  }
  const alive = (B, s) => B.units.filter(u => u.side === s && !u.dead);
  const unitAt = (B, c, r) => B.units.find(u => !u.dead && u.c === c && u.r === r);

  // ── 이동 범위 (적과 맞닿으면 멈춤)
  function reachable(B, u) {
    const out = new Map();
    out.set(key(u.c, u.r), { c: u.c, r: u.r, cost: 0, prev: null });
    if (u.fixed) return out;
    const ut = UT[u.type];
    const mp = ut.mp + (u.rout ? 1 : 0);
    const foeAdj = (c, r) => nbs(c, r).some(([x, y]) => { const e = unitAt(B, x, y); return e && e.side !== u.side; });
    const q = [[0, u.c, u.r]];
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]);
      const [d0, c, r] = q.shift();
      if (d0 > out.get(key(c, r)).cost) continue;
      if ((c !== u.c || r !== u.r) && foeAdj(c, r)) continue;
      for (const [x, y] of nbs(c, r)) {
        if (!passable(B, x, y, u)) continue;
        const o = unitAt(B, x, y);
        if (o && o.side !== u.side) continue;
        const t = B.grid[y][x].t;
        let cost = ut.sea ? T[t].cost : T[t].cost;
        if (ut.rough && ['forest', 'hill', 'mount'].includes(t)) cost = Math.max(1, cost - 1);
        if (u.type === 'cav' && ['mount', 'paddy'].includes(t)) cost += 1;
        const nd = d0 + cost;
        if (nd > mp) continue;
        const k = key(x, y), cur = out.get(k);
        if (cur && cur.cost <= nd) continue;
        out.set(k, { c: x, r: y, cost: nd, prev: key(c, r) });
        q.push([nd, x, y]);
      }
    }
    for (const [k, v] of [...out]) { const o = unitAt(B, v.c, v.r); if (o && o !== u) out.delete(k); }
    return out;
  }
  function pathOf(R0, k) { const p = []; let cur = R0.get(k); while (cur) { p.unshift([cur.c, cur.r]); cur = cur.prev === null ? null : R0.get(cur.prev); } return p; }

  // ── 피해 계산
  function skillK(u, kind, B) {
    let k = 1; const s = u.skills;
    if (B.kind === 'sea' && s.includes('navy')) k *= 1.15;
    if (u.type === 'cav' && s.includes('cav')) k *= 1.15;
    if (u.type === 'bow' && s.includes('bow')) k *= 1.15;
    if (u.type === 'gun' && s.includes('gun')) k *= 1.15;
    if (u.type === 'cannon' && s.includes('cannon')) k *= 1.15;
    if (kind === 'melee' && s.includes('charge')) k *= 1.1;
    if (u.type === 'uib' && s.includes('uib')) k *= 1.1;
    if (u.fac === 'joseon' && u.type === 'cannon' && Game.S && Game.S.reforms.hwapo) k *= 1.2;
    return k;
  }
  function power(B, u, kind, mods) {
    const ut = UT[u.type];
    const base = mods && mods.asCannon ? UT.cannon.ratk : kind === 'ranged' ? ut.ratk : ut.atk;
    const stat = kind === 'ranged' ? u.int : u.war;
    return u.n * (ut.per || 1) * base * (0.55 + u.lea / 200 + stat / 400) * (0.6 + u.tr / 250) * (0.6 + u.mo / 250) * skillK(u, kind, B);
  }
  function defense(B, d, c = d.c, r = d.r) {
    const ut = UT[d.type], h = B.grid[r][c];
    let td = T[h.t].def || 1;
    if ((h.t === 'wall' || h.t === 'gate') && d.side === B.castleSide) td = WALL_DEF[B.castle][h.t] * (0.7 + B.spec.def.wall / 150) * (d.skills.includes('siege') ? 1.15 : 1);
    else if (T[h.t].inside && d.side === B.castleSide && d.skills.includes('siege')) td *= 1.15;
    if (ut.rough && ['forest', 'hill', 'mount'].includes(h.t)) td *= 1.25;
    return ut.def * (0.55 + d.lea / 200 + d.int / 400) * td * (d.rout ? 0.7 : 1);
  }
  function kindFor(u, dd) {
    const ut = UT[u.type];
    if (ut.ratk > 0 && dd <= ut.rng && dd >= 1) return 'ranged';
    if (dd === 1 && ut.atk > 0) return 'melee';
    return null;
  }
  function bestKind(B, u, h, e) {
    const dd = hd(h.c, h.r, e.c, e.r);
    const ut = UT[u.type];
    const opts = [];
    if (ut.ratk > 0 && dd <= ut.rng && dd >= 1 && !(e.st.hide && dd > 1)) opts.push('ranged');
    if (dd === 1 && ut.atk > 0) opts.push('melee');
    if (opts.length < 2) return opts[0] || null;
    return dmgMen(B, u, e, 'ranged', true, h) >= dmgMen(B, u, e, 'melee', true, h) ? 'ranged' : 'melee';
  }
  function dmgMen(B, a, d, kind, est, from, mods) {
    const ac = from ? from.c : a.c, ar = from ? from.r : a.r;
    let k = 0.055;
    const tt = B.grid[d.r][d.c].t;
    if (a.type === 'cav' && kind === 'melee') k *= ['plain', 'village'].includes(tt) ? 1.35 : ['paddy', 'forest', 'mount', 'hill', 'ford'].includes(tt) ? 0.55 : 1;
    if (d.type === 'spear' && a.type === 'cav' && kind === 'melee') k /= UT.spear.antiCav;
    if (UT[a.type].board && kind === 'melee' && UT[d.type].sea && !UT[d.type].noBoard) k *= UT[a.type].board;
    if (UT[a.type].noBoard && kind === 'melee') k *= 1.2;
    // 판옥선은 갑판이 높아 일본 배가 기어오르기 어렵고, 얇은 일본 배는 총통에 쉽게 부서진다
    if (UT[a.type].board && kind === 'melee' && d.type === 'panok') k *= 0.5;
    if (['panok', 'turtle', 'mship'].includes(a.type) && kind === 'ranged' && ['seki', 'atake'].includes(d.type)) k *= 1.3;
    if (['seki', 'atake'].includes(a.type) && kind === 'ranged' && ['panok', 'turtle'].includes(d.type)) k *= 0.6;
    const dd = hd(ac, ar, d.c, d.r);
    if (kind === 'ranged' && dd === 1 && a.type !== 'gun' && !UT[a.type].sea) k *= 0.75;
    if (kind === 'ranged' && (tt === 'wall' || tt === 'gate') && d.side === B.castleSide) k *= 0.65;
    if (kind === 'melee' && (tt === 'wall' || tt === 'gate') && d.side === B.castleSide) k *= 0.8;
    // 성 위의 수비군은 높은 곳에서 쏘고 돌·끓는 물을 퍼붓는다
    const at = B.grid[ar][ac].t;
    if (a.side === B.castleSide && (T[at].castle || T[at].inside)) k *= 1.3;
    if (kind === 'ranged' && dd >= 3) k *= 0.85;
    // 성벽 너머 성안의 군사는 밖에서 잘 보이지 않는다
    if (kind === 'ranged' && T[tt].inside && d.side === B.castleSide && !(T[B.grid[ar][ac].t].inside || T[B.grid[ar][ac].t].castle) && a.type !== 'cannon' && !(mods && mods.asCannon)) k *= 0.4;
    if (UT[d.type].fixed) k *= 0.6;
    let men = k * power(B, a, kind, mods) / defense(B, d) * actK(B, a, d, kind, mods);
    if (!est) men *= 0.88 + Math.random() * 0.24;
    return men;
  }
  // 전법과 태세가 피해에 주는 배율
  function actK(B, a, d, kind, mods) {
    let k = mods && mods.mult ? mods.mult : 1;
    if (mods && mods.id === 'charge' && ['paddy', 'forest', 'mount', 'ford'].includes(B.grid[d.r][d.c].t)) k = 1;
    if (kind === 'ranged' && a.st.rbuff) k *= a.st.rmul || 1;
    if (kind === 'melee' && a.st.diehard) k *= 1.2;
    if (a.st.baesu) k *= 1.3;
    if (a.st.hide) k *= 1.8;
    if (d.st.mark && d.st.markBy === a.side) k *= 1.3;
    if (d.st.shield) k *= 0.6;
    if (d.st.spearwall) k *= 0.75;
    if (d.st.baesu) k *= 1.25;
    return k;
  }

  // ── 행동
  function say(B, text, cls) { B.log.unshift({ day: B.day, text: Game.josa(text), cls }); if (B.log.length > 120) B.log.pop(); }
  const shipsWord = (u, n) => UT[u.type].sea ? `${UT[u.type].name} ${n < 1 ? n.toFixed(1) : R(n)}척` : `${R(n).toLocaleString()}명`;
  function applyLoss(B, u, men, by, kind, ev) {
    const per = UT[u.type].per || 1;
    const x = Math.min(u.n, men / per);
    const before = u.n;
    u.n -= x;
    ev.push({ t: 'hit', from: by, to: u, kind, x, men: R(x * per) });
    const steady = ((B.castleSide === u.side && (T[B.grid[u.r][u.c].t].castle || T[B.grid[u.r][u.c].t].inside)) || UT[u.type].steady ? 0.7 : 1) * (u.lea >= 88 ? 0.75 : 1);
    u.mo = clamp(u.mo - ((x / Math.max(1, before)) * 90 + (by && by.type === 'gun' && kind === 'ranged' ? (UT.gun.shock || 0) : 0)) * steady, 0, 100);
    const floor = u.st.baesu ? 45 : u.st.diehard ? 40 : 0;
    if (floor && u.mo < floor) u.mo = floor;
    const minN = UT[u.type].sea ? 0.6 : 60;
    if (u.n < Math.max(minN, u.n0 * (UT[u.type].sea ? 0.04 : 0.05))) destroy(B, u, by, kind, ev);
    else if (!u.rout && u.mo < 18 && !UT[u.type].fixed) { u.rout = true; say(B, `${u.name} 부대가 무너져 달아납니다.`, 'bad-' + u.side); ev.push({ t: 'rout', u }); }
  }
  function destroy(B, u, by, kind, ev) {
    u.dead = true; u.n = 0;
    if (u.gen) {
      const r = Math.random();
      const sea = B.kind === 'sea';
      u.fate = r < (sea ? 0.28 : 0.18) ? 'dead' : r < (sea ? 0.36 : 0.4) && kind === 'melee' ? 'captive' : 'ok';
    }
    say(B, `${u.name} 부대가 궤멸했습니다.${u.fate === 'dead' ? ` ${u.name} 전사!` : u.fate === 'captive' ? ` ${u.name}이(가) 사로잡혔습니다.` : ''}`, 'bad-' + u.side);
    ev.push({ t: 'dead', u });
  }
  function strike(B, a, d, kind, ev, mods) {
    const men = dmgMen(B, a, d, kind, false, null, mods);
    if (a.st.hide) { a.st.hide = false; say(B, `${a.name} 부대가 숨어 있다가 들이쳤습니다!`, 'act-' + a.side); }
    if (kind === 'melee' && d.st.hide) d.st.hide = false;
    const verb = mods && mods.name ? mods.name + '!' : kind === 'melee' ? (UT[a.type].board && UT[d.type].sea ? '배에 올라 칼싸움' : a.type === 'turtle' ? '들이받기' : a.type === 'cav' ? '돌격' : '공격')
      : a.type === 'gun' ? '조총 사격' : a.type === 'bow' ? '활 사격' : ['cannon', 'panok', 'turtle', 'mship', 'fort'].includes(a.type) ? '포격' : '사격';
    applyLoss(B, d, men, a, kind, ev);
    say(B, `${a.name} 부대의 ${verb} → ${d.name} 부대 ${shipsWord(d, men / (UT[d.type].per || 1))} 손실`, 'act-' + a.side);
    if (mods) {
      if (mods.splash) for (const o of alive(B, d.side)) {
        if (o === d || o.fixed || hd(o.c, o.r, d.c, d.r) !== 1) continue;
        applyLoss(B, o, men * mods.splash, a, kind, ev);
        if (!o.dead) o.mo = clamp(o.mo - (mods.morale || 0) / 2, 0, 100);
      }
      if (!d.dead) {
        if (mods.morale) d.mo = clamp(d.mo - mods.morale, 0, 100);
        if (mods.shock) d.mo = clamp(d.mo - (UT.gun.shock || 5) * (mods.shock - 1), 0, 100);
        if (mods.burn && Math.random() < burnChance(B, d, mods.burn)) { d.st.fire = 2; say(B, `${d.name} 부대에 불이 붙었습니다.`, 'bad-' + d.side); }
        if (!d.rout && d.mo < 18 && !UT[d.type].fixed) { d.rout = true; say(B, `${d.name} 부대가 무너져 달아납니다.`, 'bad-' + d.side); ev.push({ t: 'rout', u: d }); }
      }
    }
    if (kind === 'melee' && !d.dead && !d.rout && UT[d.type].atk > 0.3) {
      const back = dmgMen(B, d, a, 'melee') * 0.45 * (d.st.spearwall ? (a.type === 'cav' ? 2.2 : 1.5) : 1);
      applyLoss(B, a, back, d, 'melee', ev);
    }
    a.mo = clamp(a.mo + 2, 0, 100);
  }
  function wallHit(B, u, c, r, ev, mods) {
    const h = B.grid[r][c];
    const asC = mods && mods.asCannon;
    const kind = asC || (UT[u.type].ratk > 0 && UT[u.type].rng >= hd(u.c, u.r, c, r)) ? 'ranged' : 'melee';
    const wk = asC ? UT.cannon.wallK : (UT[u.type].wallK || 0.3);
    const dmg = power(B, u, kind, mods) * 0.018 * wk * (mods && mods.wallMult || 1) * ((asC || u.type === 'cannon') && u.fac === 'joseon' && Game.S && Game.S.reforms.hwapo ? 1.5 : 1) * (0.88 + Math.random() * 0.24);
    if (mods && mods.name) say(B, `${u.name} 부대의 ${mods.name}!`, 'act-' + u.side);
    if (u.st.hide) u.st.hide = false;
    h.hp = Math.max(0, h.hp - dmg);
    ev.push({ t: 'wall', u, c, r, dmg });
    if (h.hp <= 0) {
      const was = h.t;
      B.grid[r][c] = { t: 'rubble' };
      say(B, `${u.name} 부대가 ${was === 'gate' ? '성문을 부쉈습니다' : '성벽을 무너뜨렸습니다'}!`, 'act-' + u.side);
      ev.push({ t: 'breach', c, r });
      fields(B);
    } else say(B, `${u.name} 부대가 ${h.t === 'gate' ? '성문' : '성벽'}을 공격합니다. (남은 내구 ${R(h.hp)})`, 'act-' + u.side);
  }
  // ── 전법
  // 장수 고유 전법과 계략 (장수 정보 창에서도 쓴다)
  function genActIds(g) {
    const d = GD.GENS[g], tricks = [];
    if (d.int >= 75 || d.skills.includes('trick')) tricks.push('fire');
    if (d.int >= 80 || d.skills.includes('trick')) tricks.push('conf');
    if (d.cha >= 75) tricks.push('rally');
    return { sig: GD.GEN_ACTS[g] || [], tricks };
  }
  function actsOf(B, u) {
    const list = [...(GD.TYPE_ACTS[u.type] || [])];
    if (u.gen) { const g = genActIds(u.gen); for (const id of [...g.sig, ...g.tricks]) if (!list.includes(id)) list.push(id); }
    return list.filter(id => {
      const A = GD.ACTS[id];
      if (A.where && A.where !== B.kind) return false;
      if (A.castle && !(B.castle && u.side === B.castleSide)) return false;
      if (A.kind === 'hit' && A.melee && UT[u.type].atk <= 0) return false;
      return true;
    });
  }
  const actReady = (B, u, id) => !(u.cd[id] > B.day);
  const actWait = (B, u, id) => Math.max(0, (u.cd[id] || 0) - B.day);
  function actRange(u, id) {
    const A = GD.ACTS[id];
    if (A.rng !== undefined) return A.rng;
    return A.kind === 'hit' ? (A.ranged ? UT[u.type].rng : 1) : 0;
  }
  function burnChance(B, d, base) {
    const t = B.grid[d.r][d.c].t;
    const p = base + (t === 'forest' ? 0.15 : 0) + (B.kind === 'sea' && UT[d.type].board ? 0.15 : 0) - (['paddy', 'ford', 'shoal'].includes(t) ? 0.15 : 0);
    return clamp(p, 0.05, 0.85);
  }
  // 화공·혼란·유인 매복이 먹힐 확률
  function trickOdds(B, u, id, e) {
    if (id === 'lure') return clamp(0.55 + (u.int - e.int) / 120, 0.2, 0.9);
    let p = (id === 'fire' ? 0.3 : 0.28) + (u.int - e.int) / 90;
    if (id === 'fire') {
      const t = B.grid[e.r][e.c].t;
      if (t === 'forest') p += 0.15;
      if (B.kind === 'sea') p += 0.12 + (UT[e.type].board ? 0.1 : 0);
      if (['paddy', 'ford', 'shoal'].includes(t)) p -= 0.15;
    }
    if (u.skills.includes('trick')) p += 0.12;
    return clamp(p, 0.05, 0.9);
  }
  const needsTarget = (id) => GD.ACTS[id].kind === 'hit' || !!GD.ACTS[id].target;
  // 전법을 걸 수 있는 적 (h 자리에서)
  function actTargets(B, u, id, h = u) {
    if (!needsTarget(id)) return [];
    const A = GD.ACTS[id], rng = actRange(u, id);
    return alive(B, u.side === 'A' ? 'D' : 'A').filter(e => {
      const dd = hd(h.c, h.r, e.c, e.r);
      if (dd < 1 || dd > rng) return false;
      if (A.melee && dd !== 1) return false;
      if (e.st.hide && dd > 1) return false;
      if (A.kind !== 'hit' && e.fixed) return false;
      if (id === 'board' && UT[e.type].noBoard) return false;
      return true;
    });
  }
  function actWalls(B, u, id, h = u) {
    const A = GD.ACTS[id];
    if (!(A.kind === 'hit' && A.wallMult && B.castle && u.side !== B.castleSide)) return [];
    return nbsWithin(h.c, h.r, actRange(u, id)).filter(([x, y]) => ['wall', 'gate'].includes(B.grid[y][x].t) && !unitAt(B, x, y));
  }
  // 지금 이 자리에서 못 쓰는 까닭 (쓸 수 있으면 빈 문자열)
  function actBlocked(B, u, id) {
    const A = GD.ACTS[id];
    if (!actReady(B, u, id)) return `${actWait(B, u, id)}일 뒤`;
    if (A.rough && !ROUGH.includes(B.grid[u.r][u.c].t)) return '숲·산·구릉·마을에서만';
    if (A.rough && alive(B, u.side === 'A' ? 'D' : 'A').some(e => hd(e.c, e.r, u.c, u.r) <= 1)) return '적이 바로 옆에 있음';
    if (needsTarget(id) && !actTargets(B, u, id).length && !actWalls(B, u, id).length) return '닿는 적이 없음';
    return '';
  }
  // 움직인 뒤: 숨어 있던 자신은 드러나고, 바로 옆에 숨은 적도 들킨다
  function afterMove(B, u) {
    if (u.st.hide) u.st.hide = false;
    for (const e of alive(B, u.side === 'A' ? 'D' : 'A')) {
      if (e.st.hide && hd(e.c, e.r, u.c, u.r) === 1) { e.st.hide = false; say(B, `숨어 있던 ${e.name} 부대가 드러났습니다.`, 'sys'); }
    }
  }
  function useAct(B, u, id, t, ev) {
    const A = GD.ACTS[id];
    u.cd[id] = B.day + A.cd;
    const foes = alive(B, u.side === 'A' ? 'D' : 'A'), friends = alive(B, u.side);
    const near = (list, k) => list.filter(o => hd(o.c, o.r, u.c, u.r) <= k);
    const onCastle = (o) => T[B.grid[o.r][o.c].t].castle || T[B.grid[o.r][o.c].t].inside;
    const side = 'act-' + u.side;
    if (A.kind === 'hit') {
      ev.push({ t: 'act', u, id });
      const mods = Object.assign({ id }, A);
      if (Array.isArray(t)) wallHit(B, u, t[0], t[1], ev, mods);
      else if (t && !t.dead) strike(B, u, t, A.ranged ? 'ranged' : 'melee', ev, mods);
      return;
    }
    if (A.target && t) {
      const ok = Math.random() < trickOdds(B, u, id, t);
      ev.push({ t: 'trick', u, tk: id, ok, to: t });
      if (id === 'lure') { t.st.mark = 1; t.st.markBy = u.side; }
      if (!ok) { say(B, `${u.name}의 ${A.name}이(가) 실패했습니다.${id === 'lure' ? ' (그래도 적의 빈틈이 드러났습니다)' : ''}`, side); return; }
      if (id === 'fire') {
        say(B, `${u.name}의 화공! ${t.name} 부대에 불길이 번집니다.`, side);
        applyLoss(B, t, Math.min(t.n * (UT[t.type].per || 1) * (B.kind === 'sea' ? 0.14 : 0.08), u.n * (UT[u.type].per || 1) * 0.35), u, 'trick', ev);
        t.st.fire = 2; t.mo = clamp(t.mo - 8, 0, 100);
      } else {
        t.st.conf = 1; t.mo = clamp(t.mo - 5, 0, 100);
        say(B, `${u.name}의 ${A.name}에 ${t.name} 부대가 혼란에 빠졌습니다.`, side);
      }
      return;
    }
    ev.push({ t: 'act', u, id });
    switch (id) {
      case 'shield': u.st.shield = 1; say(B, `${u.name} 부대가 방패진을 쳤습니다. (받는 피해 -40%)`, side); break;
      case 'spearwall': u.st.spearwall = 1; say(B, `${u.name} 부대가 장창진을 쳤습니다.`, side); break;
      case 'ambush': u.st.hide = true; say(B, `${u.name} 부대가 몸을 숨겼습니다.`, side); break;
      case 'diehard': u.st.diehard = 2; u.mo = Math.max(u.mo, 40); say(B, `${u.name} 부대가 죽기를 각오합니다!`, side); break;
      case 'baesu': u.st.baesu = 2; u.mo = Math.max(u.mo, 45); say(B, `${u.name}이(가) 배수진을 쳤습니다. 물러설 곳은 없다!`, side); break;
      case 'hagik': {
        const ships = near(friends, A.rng).filter(o => UT[o.type].sea);
        for (const o of ships) { o.st.rbuff = Math.max(o.st.rbuff || 0, 1); o.st.rmul = 1.35; }
        say(B, `${u.name}의 학익진! ${ships.length}개 함대가 날개를 펴 적을 감쌉니다.`, side); break;
      }
      case 'chongtong': {
        const list = near(friends, A.rng).filter(onCastle);
        for (const o of list) { o.st.rbuff = 2; o.st.rmul = 1.4; }
        say(B, `${u.name}이(가) 성벽 위에 총통을 걸었습니다. 성안 부대의 사격이 거세집니다.`, side); break;
      }
      case 'tuseok': {
        let n = 0;
        for (const e of near(foes, A.rng + 1)) {
          if (!nbs(e.c, e.r).some(([x, y]) => ['wall', 'gate'].includes(B.grid[y][x].t))) continue;
          applyLoss(B, e, Math.min(e.n * (UT[e.type].per || 1) * 0.05, u.n * (UT[u.type].per || 1) * 0.3), u, 'ranged', ev);
          if (!e.dead) e.mo = clamp(e.mo - 8, 0, 100);
          n++;
        }
        say(B, `${u.name}의 투석전! 성벽에 붙은 적 ${n}개 부대에 돌과 재가 쏟아집니다.`, side); break;
      }
      case 'hongui': {
        const list = near(friends, A.rng).filter(o => ROUGH.includes(B.grid[o.r][o.c].t) && !foes.some(e => hd(e.c, e.r, o.c, o.r) <= 1));
        for (const o of list) o.st.hide = true;
        say(B, `${u.name}의 홍의 매복! ${list.length}개 부대가 산과 숲에 숨었습니다.`, side); break;
      }
      case 'monkrally': {
        for (const o of near(friends, A.rng)) { o.mo = clamp(o.mo + 15, 0, 100); o.st.diehard = Math.max(o.st.diehard || 0, 1); if (o.rout && o.mo >= 35) o.rout = false; }
        say(B, `${u.name}의 승병 결사! 이웃한 부대들이 결의를 다집니다.`, side); break;
      }
      case 'rally': {
        const gain = 10 + R(u.cha / 10);
        for (const o of [u, ...friends.filter(o => hd(o.c, o.r, u.c, u.r) === 1)]) { o.mo = clamp(o.mo + (o === u ? gain : 8), 0, 100); if (o.rout && o.mo >= 35) o.rout = false; }
        say(B, `${u.name}이(가) 북을 울려 군사를 북돋웠습니다.`, side); break;
      }
      case 'repair': {
        let n = 0;
        for (const [x, y] of nbsWithin(u.c, u.r, A.rng).concat([[u.c, u.r]])) { const g = B.grid[y][x]; if (g.hpMax && g.hp < g.hpMax) { g.hp = Math.min(g.hpMax, g.hp + g.hpMax * 0.3); n++; } }
        say(B, `${u.name}이(가) 성벽 ${n}곳을 고쳤습니다.`, side); break;
      }
      case 'nightraid': {
        let n = 0;
        for (const e of near(foes, A.rng)) { if (e.fixed) continue; if (Math.random() < 0.6) { e.st.conf = 1; n++; } e.mo = clamp(e.mo - 8, 0, 100); }
        say(B, `${u.name}의 야습! 적 ${n}개 부대가 혼란에 빠졌습니다.`, side); break;
      }
    }
  }
  // a: { to:{c,r}, target, kind, wall:[c,r], act, wait }
  function act(B, u, a) {
    const ev = [];
    if (!a || u.dead) return ev;
    if (a.to && (a.to.c !== u.c || a.to.r !== u.r)) {
      const Rm = reachable(B, u), k = key(a.to.c, a.to.r);
      if (Rm.has(k)) { ev.push({ t: 'move', u, path: pathOf(Rm, k) }); u.c = a.to.c; u.r = a.to.r; u.moved = true; afterMove(B, u); }
    }
    if (a.act) useAct(B, u, a.act, a.wall || a.target || null, ev);
    else {
      const kind = a.target && !a.target.dead ? a.kind || kindFor(u, hd(u.c, u.r, a.target.c, a.target.r)) : null;
      if (kind) strike(B, u, a.target, kind, ev);
      else if (a.wall) wallHit(B, u, a.wall[0], a.wall[1], ev);
    }
    u.done = true;
    checkOver(B);
    return ev;
  }

  // ── 차례·하루
  function startPhase(B, side) {
    B.side = side;
    if (side === 'A' && B.castle && !B.over) {
      const k = unitAt(B, B.keep[0], B.keep[1]);
      if (k && k.side === 'A') { B.over = { win: 'A', why: '본진을 점령해 성을 함락했습니다' }; return; }
    }
    for (const u of alive(B, side)) {
      u.done = false; u.moved = false;
      for (const k of ['shield', 'spearwall', 'diehard', 'baesu', 'rbuff']) if (u.st[k] > 0) u.st[k]--;
      if (u.st.fire > 0) { const ev = []; applyLoss(B, u, u.n * (UT[u.type].per || 1) * 0.04, null, 'fire', ev); u.st.fire--; if (!u.dead) say(B, `${u.name} 부대가 불길에 시달립니다.`, 'bad-' + side); }
      if (u.rout && !alive(B, side === 'A' ? 'D' : 'A').some(e => hd(e.c, e.r, u.c, u.r) <= 2)) { u.mo += 12; if (u.mo >= 35) { u.rout = false; say(B, `${u.name} 부대가 전열을 가다듬었습니다.`, 'act-' + side); } }
    }
    fields(B);
    checkOver(B);
  }
  function endDay(B) {
    if (B.tmpl === 'strait') {
      if (B.day === 5) { B.flowDir = -1; say(B, '물살이 바뀌었습니다! 좁은 물목의 배들이 거꾸로 밀려납니다.', 'sys'); }
      const movers = alive(B, 'A').concat(alive(B, 'D')).filter(u => B.grid[u.r][u.c].flow);
      for (const u of movers) {
        const nc = u.c + B.flowDir;
        if (inb(nc, u.r) && T[B.grid[u.r][nc].t].water && !unitAt(B, nc, u.r)) u.c = nc;
        else if (B.flowDir < 0 && u.side === 'A') { u.mo = clamp(u.mo - 6, 0, 100); }
        if (B.flowDir < 0 && u.side === 'A' && !u.dead) { u.n -= u.n * 0.04; u.mo = clamp(u.mo - 5, 0, 100); }
      }
    }
    for (const u of B.units) u.st.mark = 0;
    B.day++;
    if (B.day > B.maxDay && !B.over) B.over = { win: 'D', why: B.kind === 'land' ? '날이 다하도록 성을 지켜 냈습니다' : '공격 쪽이 물러났습니다' };
  }
  function checkOver(B) {
    if (B.over) return B.over;
    for (const s of ['A', 'D']) {
      const o = s === 'A' ? 'D' : 'A';
      if (B.units.some(u => u.side === s && u.cmdr && u.dead)) return (B.over = { win: o, why: `${B.units.find(u => u.side === s && u.cmdr).name}이(가) 이끄는 본대가 무너졌습니다` });
      const act = alive(B, s).filter(u => !u.rout && !u.fixed);
      if (!act.length) return (B.over = { win: o, why: s === 'A' ? '공격군이 모두 무너졌습니다' : '수비군이 모두 무너졌습니다' });
    }
    return null;
  }
  function retreat(B, side) {
    for (const u of alive(B, side)) u.n = Math.max(0, u.n * 0.9);
    B.over = { win: side === 'A' ? 'D' : 'A', why: `${GD.FAC[B.fac[side]].name}군이 물러났습니다` };
  }
  function sidePower(B, s) { return alive(B, s).reduce((t, u) => t + power(B, u, UT[u.type].ratk > UT[u.type].atk ? 'ranged' : 'melee') * (u.rout ? 0.3 : 1), 0); }

  // ── 전투 AI
  function positional(B, u, h, foes) {
    const t = B.grid[h.r][h.c].t;
    const ut = UT[u.type];
    let s = ((T[t].def || 1) - 1) * 90;
    const md = foes.length ? Math.min(...foes.map(e => hd(h.c, h.r, e.c, e.r))) : 9;
    let expo = 0;
    for (const e of foes) {
      if (e.rout) continue;
      const reachE = UT[e.type].mp / 2 + UT[e.type].rng;
      if (hd(h.c, h.r, e.c, e.r) <= reachE) {
        const kind = UT[e.type].ratk > UT[e.type].atk ? 'ranged' : 'melee';
        const dd = defense(B, u, h.c, h.r);
        expo += 0.055 * power(B, e, kind) / dd;
      }
    }
    s -= expo / B.scale * 1000 * 0.35;
    if (u.side === B.castleSide) {
      const sally = sidePower(B, 'D') > sidePower(B, 'A') * 1.8;
      if (h.c === B.keep[0] && h.r === B.keep[1]) {
        const keeper = unitAt(B, B.keep[0], B.keep[1]);
        if (u.cmdr || !keeper || keeper === u) s += 260;
      }
      if (!sally) {
        if (T[t].castle) s += ut.rng > 1 ? 90 : 50;
        else if (T[t].inside) s += 40;
        else s -= 120;
        return s - md * 2;
      }
    }
    if (u.side === 'A' && B.castle) s -= B.fA[key(h.c, h.r)] * 22;
    else s -= (u.side === 'A' ? B.fA : B.fD)[key(h.c, h.r)] * 14;
    if (ut.rng > 1) { s -= Math.abs(md - ut.rng) * 14; if (md === 1 && u.type !== 'gun' && !ut.sea) s -= 50; if (md === 1 && ut.sea && !ut.noBoard && u.fac !== 'japan') s -= 70; }
    return s;
  }
  function aiChoose(B, u) {
    if (u.dead || u.done) return null;
    if (u.st.conf > 0) { u.st.conf--; return { wait: true }; }
    const foes = alive(B, u.side === 'A' ? 'D' : 'A');
    if (!foes.length) return { wait: true };
    const Rm = reachable(B, u);
    if (u.rout) {
      let best = null, bs = -1e9;
      for (const h of Rm.values()) { const md = Math.min(...foes.map(e => hd(h.c, h.r, e.c, e.r))); const s = md * 10 - h.cost; if (s > bs) { bs = s; best = h; } }
      return { to: best, wait: true };
    }
    let best = { score: -1e9, wait: true };
    const acts = actsOf(B, u).filter(id => actReady(B, u, id));
    const hitActs = acts.filter(id => GD.ACTS[id].kind === 'hit');
    const canAmbush = acts.includes('ambush');
    const breached = B.castle && B.grid.some(row => row.some(g => g.t === 'rubble'));
    for (const h of Rm.values()) {
      const pos = positional(B, u, h, foes);
      // 공격 전법
      for (const id of hitActs) {
        const A = GD.ACTS[id], mods = Object.assign({ id }, A), kind = A.ranged ? 'ranged' : 'melee';
        for (const e of actTargets(B, u, id, h)) {
          const men = dmgMen(B, u, e, kind, true, h, mods);
          let s = men / B.scale * 1000 * (e.cmdr ? 1.5 : 1) * (e.rout ? 1.1 : 1) + pos + (A.morale || 0) * 2 + (A.burn ? 35 : 0) + (A.splash ? 50 : 0) + (A.shock ? 20 : 0);
          if (kind === 'melee' && UT[e.type].atk > 0.3 && !e.rout) s -= 0.45 * 0.055 * power(B, e, 'melee') / defense(B, u, h.c, h.r) * (e.st.spearwall ? 1.8 : 1) / B.scale * 1000 * 0.7;
          if (s > best.score) best = { score: s, to: h, act: id, target: e };
        }
        for (const w of actWalls(B, u, id, h)) {
          const g = B.grid[w[1]][w[0]];
          const dmg = power(B, u, 'ranged', mods) * 0.018 * (A.asCannon ? UT.cannon.wallK : (UT[u.type].wallK || 0.3)) * (A.wallMult || 1);
          const s = (dmg / g.hpMax * 600 * (g.t === 'gate' ? 1.5 : 1) + (dmg >= g.hp ? 300 : 0) + 40) * (breached ? 0.15 : 1) + pos;
          if (s > best.score) best = { score: s, to: h, act: id, wall: w };
        }
      }
      // 매복: 숲·산에 들어가 숨는다
      if (canAmbush && ROUGH.includes(B.grid[h.r][h.c].t) && !foes.some(e => hd(e.c, e.r, h.c, h.r) <= 1) && foes.some(e => hd(e.c, e.r, h.c, h.r) <= 5)) {
        if (pos + 110 > best.score) best = { score: pos + 110, to: h, act: 'ambush' };
      }
      for (const e of foes) {
        const kind = bestKind(B, u, h, e);
        if (!kind) continue;
        const men = dmgMen(B, u, e, kind, true, h);
        const per = UT[e.type].per || 1;
        const frac = men / per / Math.max(0.5, e.n);
        let counter = 0;
        if (kind === 'melee' && UT[e.type].atk > 0.3 && !e.rout) counter = 0.45 * 0.055 * power(B, e, 'melee') / defense(B, u, h.c, h.r);
        const s = men / B.scale * 1000 * (e.cmdr ? 1.5 : 1) * (e.rout ? 1.1 : 1) + (frac > 0.9 ? 400 : 0) - counter / B.scale * 1000 * 0.7 + pos;
        if (s > best.score) best = { score: s, to: h, target: e, kind };
      }
      if (B.castle && u.side !== B.castleSide) {
        const breached = B.grid.some(row => row.some(g => g.t === 'rubble'));
        for (const [x, y] of nbsWithin(h.c, h.r, UT[u.type].ratk > 0 ? UT[u.type].rng : 1)) {
          const g = B.grid[y][x];
          if (!(g.t === 'wall' || g.t === 'gate') || unitAt(B, x, y)) continue;
          const kind = UT[u.type].ratk > 0 && UT[u.type].rng >= hd(h.c, h.r, x, y) ? 'ranged' : 'melee';
          const dmg = power(B, u, kind) * 0.018 * (UT[u.type].wallK || 0.3);
          const s = (dmg / g.hpMax * 600 * (g.t === 'gate' ? 1.5 : 1) + (dmg >= g.hp ? 300 : 0) + 40) * (breached ? 0.15 : 1) + pos;
          if (s > best.score) best = { score: s, to: h, wall: [x, y] };
        }
      }
      if (pos > best.score) best = { score: pos, to: h, wait: true };
    }
    // 제자리에서 쓰는 전법 (태세·도움·흔들기)
    const here = { c: u.c, r: u.r };
    const posHere = positional(B, u, here, foes);
    const friends = alive(B, u.side).filter(o => o !== u);
    const nearF = (k) => friends.filter(o => hd(o.c, o.r, u.c, u.r) <= k);
    const nearE = (k) => foes.filter(e => hd(e.c, e.r, u.c, u.r) <= k);
    for (const id of acts) {
      const A = GD.ACTS[id];
      if (A.kind === 'hit' || id === 'ambush') continue;
      let val = 0, tgt = null;
      if (id === 'shield' || id === 'spearwall') {
        const inc = incoming(B, u, here, foes) / B.scale * 1000;
        val = inc * (id === 'shield' ? 0.4 : 0.25) + (id === 'spearwall' && nearE(6).some(e => e.type === 'cav') ? 40 : 0);
      } else if (id === 'diehard') val = nearE(2).length && u.mo < 80 ? 60 : 0;
      else if (id === 'baesu') val = nearE(3).length ? 80 : 0;
      else if (id === 'hagik') val = nearF(A.rng).filter(o => UT[o.type].sea && !o.done && foes.some(e => hd(e.c, e.r, o.c, o.r) <= UT[o.type].rng + 2)).length * 70;
      else if (id === 'chongtong') val = nearF(A.rng).filter(o => !o.done && UT[o.type].rng > 1 && (T[B.grid[o.r][o.c].t].castle || T[B.grid[o.r][o.c].t].inside) && foes.some(e => hd(e.c, e.r, o.c, o.r) <= UT[o.type].rng)).length * 60;
      else if (id === 'tuseok') val = nearE(A.rng + 1).filter(e => nbs(e.c, e.r).some(([x, y]) => ['wall', 'gate'].includes(B.grid[y][x].t))).length * 55;
      else if (id === 'hongui') { const n = [u, ...nearF(A.rng)].filter(o => !o.st.hide && ROUGH.includes(B.grid[o.r][o.c].t) && !foes.some(e => hd(e.c, e.r, o.c, o.r) <= 1)).length; val = n >= 2 && nearE(6).length ? n * 45 : 0; }
      else if (id === 'monkrally') val = nearF(A.rng).reduce((t, o) => t + (o.rout ? 60 : o.mo < 70 ? 25 : 0), 0);
      else if (id === 'rally') val = u.mo < 45 || nearF(1).some(o => o.rout) ? 90 : 0;
      else if (id === 'repair') { let miss = 0; for (const [x, y] of nbsWithin(u.c, u.r, A.rng).concat([[u.c, u.r]])) { const g = B.grid[y][x]; if (g.hpMax) miss += (g.hpMax - g.hp) / g.hpMax; } val = miss * 250; }
      else if (id === 'nightraid') val = nearE(A.rng).filter(e => !e.fixed).length * 42;
      else if (A.target) {
        for (const e of actTargets(B, u, id)) {
          const p = trickOdds(B, u, id, e);
          if (p < 0.45) continue;
          const v = id === 'fire' ? p * Math.min(e.n * (UT[e.type].per || 1) * (B.kind === 'sea' ? 0.14 : 0.08), u.n * (UT[u.type].per || 1) * 0.35) / B.scale * 1000 : id === 'lure' ? p * 90 + 50 : p * 90;
          if (v > val) { val = v; tgt = e; }
        }
      }
      if (val > 0 && posHere + val > best.score) best = { score: posHere + val, to: here, act: id, target: tgt };
    }
    return best;
  }
  // 다음 적 차례에 받을 것으로 보이는 피해 (군사 수)
  function incoming(B, u, h, foes) {
    let t = 0;
    for (const e of foes) {
      if (e.rout || hd(h.c, h.r, e.c, e.r) > UT[e.type].mp / 2 + UT[e.type].rng) continue;
      const kind = UT[e.type].ratk > UT[e.type].atk ? 'ranged' : 'melee';
      t += 0.055 * power(B, e, kind) / defense(B, u, h.c, h.r);
    }
    return t;
  }
  function nbsWithin(c, r, k) {
    const out = [];
    for (let y = Math.max(0, r - k); y <= Math.min(ROWS - 1, r + k); y++) for (let x = Math.max(0, c - k - 1); x <= Math.min(COLS - 1, c + k + 1); x++) {
      const d = hd(c, r, x, y); if (d >= 1 && d <= k) out.push([x, y]);
    }
    return out;
  }
  // 주변을 돕는 전법이 있는 부대가 먼저 움직인다
  function order(B, side) {
    const lead = (u) => actsOf(B, u).some(id => ['hagik', 'chongtong', 'hongui', 'monkrally'].includes(id) && actReady(B, u, id)) ? 1 : 0;
    return alive(B, side).filter(u => !u.done).sort((a, b) => (lead(b) - lead(a)) || (UT[b.type].rng - UT[a.type].rng) || (a.type === 'cav') - (b.type === 'cav'));
  }
  function aiShouldRetreat(B, side) {
    if (B.day < 6 || side === B.castleSide) return false;
    const mine = sidePower(B, side), theirs = sidePower(B, side === 'A' ? 'D' : 'A');
    const mo = alive(B, side).reduce((s, u) => s + u.mo, 0) / Math.max(1, alive(B, side).length);
    return mine < theirs * 0.15 && mo < 35;
  }

  // ── 결과
  function result(B) {
    const side = (s) => {
      const us = B.units.filter(u => u.side === s && !u.fixed && !u.ally);
      const gens = us.filter(u => u.gen).map(u => {
        let f = u.fate || 'ok';
        if (!u.dead && B.over.win !== s && B.castle && s === 'D' && B.over.why.includes('함락') && Math.random() < 0.15) f = 'captive';
        return { id: u.gen, fate: f };
      });
      if (B.kind === 'land') return { left: R(us.reduce((t, u) => t + (u.dead ? 0 : u.n), 0)), gens };
      const ships = {};
      for (const u of us) if (!u.dead) ships[u.type] = (ships[u.type] || 0) + Math.floor(u.n + 0.3);
      return { ships, gens };
    };
    let wl = 1;
    if (B.kind === 'land' && B.castle) {
      let hp = 0, max = 0;
      for (const row of B.grid) for (const h of row) if (h.hpMax) { hp += h.hp; max += h.hpMax; }
      const rub = B.grid.flat().filter(h => h.t === 'rubble').length;
      max += rub * 300;
      wl = max ? clamp(hp / max, 0.2, 1) : 1;
    }
    const att = side('A');
    att.allies = (B.spec.att.allies || []).map((al, i) => {
      const us = B.units.filter(u => u.ally === i + 1);
      return { left: R(us.reduce((t, u) => t + (u.dead ? 0 : u.n), 0)), gens: us.filter(u => u.gen).map(u => ({ id: u.gen, fate: u.fate || 'ok' })) };
    });
    return { win: B.over.win === 'A' ? 'att' : 'def', why: B.over.why, att, def: side('D'), wallLeft: wl, days: Math.min(B.day, B.maxDay) };
  }

  // 화면 없이 끝까지 (컴퓨터끼리, 즉시 결과)
  // 지금 차례(B.side)부터 이어서 끝까지
  function finish(B) {
    let guard = 0;
    while (!B.over && guard++ < 200) {
      const s = B.side;
      if (aiShouldRetreat(B, s)) { retreat(B, s); break; }
      for (const u of order(B, s)) { if (B.over) break; act(B, u, aiChoose(B, u)); }
      if (B.over) break;
      if (s === 'D') { endDay(B); if (B.over) break; startPhase(B, 'A'); }
      else startPhase(B, 'D');
    }
    if (!B.over) B.over = { win: 'D', why: '승부가 나지 않았습니다' };
    return result(B);
  }
  function simulate(spec) {
    const B = setup(spec);
    TB_last = B;
    if (B.over) return result(B);
    startPhase(B, 'A');
    return finish(B);
  }

  // ═════════ 화면 ═════════
  let V = null; // { B, root, svg, ..., resolve }
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const hexPts = (cx, cy, rr = HR) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(' ');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function run(spec, opts = {}) {
    const B = setup(spec);
    const root = opts.root;
    return new Promise((resolve) => {
      V = { B, root, resolve, sel: null, R: null, mode: null, speed: opts.speed || 1, player: spec.player === 'att' ? 'A' : spec.player === 'def' ? 'D' : null, delegated: false, instant: false, hist: opts.hist };
      build();
      loop();
    });
  }
  function build() {
    const { B, root } = V;
    const sp = B.spec;
    const facA = GD.FAC[B.fac.A], facD = GD.FAC[B.fac.D];
    root.innerHTML = `
      <div class="tb-top">
        <div class="tb-title"><span class="tb-seal">${B.kind === 'sea' ? '海戰' : B.castle ? '攻城' : '野戰'}</span><div><b>${sp.title}</b><small>${sp.y}년 ${sp.m}월 · ${B.kind === 'sea' ? '해전' : B.castle ? ({ eup: '읍성', san: '산성', wae: '왜성' })[B.castle] + ' 공방전' : '야전'}</small></div></div>
        <div class="tb-sides">
          <div class="tb-side A" style="--fc:${facA.color}"><span>${facA.name} (공격)</span><div class="tb-bar"><i id="tbBarA"></i></div><b id="tbNumA"></b></div>
          <div class="tb-day"><b id="tbDay"></b><small id="tbPhase"></small></div>
          <div class="tb-side D" style="--fc:${facD.color}"><span>${facD.name} (수비)</span><div class="tb-bar"><i id="tbBarD"></i></div><b id="tbNumD"></b></div>
        </div>
      </div>
      <div class="tb-main">
        <aside class="tb-left"><div id="tbCard" class="tb-card"></div><div id="tbHex" class="tb-hexinfo"></div></aside>
        <div class="tb-field"><svg id="tbSvg" viewBox="0 0 ${R(HW * (COLS + 0.5) + 8)} ${R(HR * 1.5 * (ROWS - 1) + HR * 2 + 8)}"></svg><div id="tbFloat" class="tb-float"></div></div>
        <aside class="tb-right"><div class="tb-units" id="tbUnits"></div><div class="tb-log" id="tbLog"></div></aside>
      </div>
      <div class="tb-bottom">
        <div class="tb-hint" id="tbHint"></div>
        <div class="tb-btns">
          <select id="tbSpeed" class="btn" title="애니메이션 속도"><option value="0.6">느리게</option><option value="1" selected>보통</option><option value="2">빠르게</option></select>
          <button class="btn" id="tbAct" disabled title="병종 전법·장수 고유 전법·계략">전법</button>
          <button class="btn" id="tbWait" disabled>대기</button>
          <button class="btn primary" id="tbEnd">차례 마침</button>
          <button class="btn" id="tbAuto" title="남은 전투를 컴퓨터에게 맡기고 지켜봅니다">위임</button>
          <button class="btn" id="tbInstant" title="애니메이션 없이 결과까지">즉시 결과</button>
          <button class="btn danger" id="tbRetreat">퇴각</button>
        </div>
      </div>
      <div class="tb-result hidden" id="tbResult"></div>`;
    V.svg = root.querySelector('#tbSvg');
    V.lay = {};
    for (const k of ['hex', 'deco', 'hp', 'hl', 'units', 'fx']) V.lay[k] = el('g', { class: 'tb-' + k }, V.svg);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const [x, y] = px(c, r);
      const p = el('polygon', { points: hexPts(x, y), class: 'tb-h', 'data-k': key(c, r) }, V.lay.hex);
      p.addEventListener('click', () => onHex(c, r));
      p.addEventListener('mouseenter', () => hoverHex(c, r));
    }
    drawTerrain();
    root.querySelector('#tbSpeed').value = String(V.speed);
    root.querySelector('#tbSpeed').addEventListener('change', (e) => { V.speed = +e.target.value; });
    root.querySelector('#tbEnd').addEventListener('click', () => endPlayerPhase());
    root.querySelector('#tbWait').addEventListener('click', () => { if (V.sel) { V.sel.done = true; deselect(); render(); maybeAutoEnd(); } });
    root.querySelector('#tbAct').addEventListener('click', () => actMenu());
    root.querySelector('#tbAuto').addEventListener('click', () => { V.delegated = true; deselect(); if (V.phaseResolve) V.phaseResolve(); });
    root.querySelector('#tbInstant').addEventListener('click', () => { V.instant = true; V.delegated = true; deselect(); if (V.phaseResolve) V.phaseResolve(); });
    root.querySelector('#tbRetreat').addEventListener('click', () => {
      if (!V.player || V.B.over) return;
      if (!confirm('군사를 거두어 물러나시겠습니까? 전투에서 진 것으로 처리됩니다.')) return;
      retreat(V.B, V.player); deselect(); if (V.phaseResolve) V.phaseResolve();
    });
    if (!V.player) { for (const id of ['tbAct', 'tbWait', 'tbEnd', 'tbAuto', 'tbRetreat']) root.querySelector('#' + id).classList.add('hidden'); }
    render();
  }
  function drawTerrain() {
    const { B } = V;
    for (const p of V.lay.hex.children) {
      const k = +p.dataset.k, c = k % COLS, r = Math.floor(k / COLS);
      const h = B.grid[r][c];
      p.setAttribute('class', `tb-h t-${h.t}${h.flow ? ' flow' : ''}`);
    }
    V.lay.deco.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const h = B.grid[r][c], [x, y] = px(c, r);
      const dg = (s) => { const g = el('g', { transform: `translate(${x} ${y})`, class: 'tb-d' }, V.lay.deco); g.innerHTML = s; return g; };
      if (h.t === 'forest') dg('<path d="M-9 6 L-5 -4 L-1 6 Z M1 7 L6 -6 L11 7 Z M-4 9 L0 0 L4 9Z" class="d-tree"/>');
      else if (h.t === 'mount') dg('<path d="M-14 9 L-4 -9 L3 2 L7 -4 L15 9 Z" class="d-mt"/><path d="M-4 -9 L-1 -4 L-6 -3 Z" class="d-snow"/>');
      else if (h.t === 'hill') dg('<path d="M-13 7 Q-3 -7 8 7 Z M0 8 Q8 -2 14 8 Z" class="d-hill"/>');
      else if (h.t === 'paddy') dg('<path d="M-12 -3 H12 M-12 3 H12 M-6 -9 V9 M6 -9 V9" class="d-paddy"/>');
      else if (h.t === 'village') dg('<path d="M-9 3 L-4 -3 L1 3 Z M-8 3 V8 H0 V3 M2 0 L7 -6 L12 0 Z M3 0 V6 H11 V0" class="d-vil"/>');
      else if (h.t === 'wall' || h.t === 'gate') dg(h.t === 'gate' ? '<rect x="-11" y="-9" width="22" height="18" class="d-wall"/><path d="M-5 9 V0 A5 5 0 0 1 5 0 V9 Z" class="d-gate"/>' : '<rect x="-12" y="-7" width="24" height="14" class="d-wall"/><path d="M-12 -7 V-11 H-6 V-7 M-3 -7 V-11 H3 V-7 M6 -7 V-11 H12 V-7" class="d-wall"/>');
      else if (h.t === 'keep') dg('<path d="M-10 8 V-2 H10 V8 Z M-12 -2 L0 -11 L12 -2 Z" class="d-keep"/>');
      else if (h.t === 'rubble') dg('<path d="M-10 6 L-6 1 L-2 5 L2 -1 L6 4 L10 2" class="d-rub"/>');
      else if (h.t === 'cliff') dg('<path d="M-12 8 L-8 -6 L-3 4 L2 -8 L7 3 L12 -5" class="d-cliff"/>');
      else if ((h.t === 'river' || h.t === 'sea' || h.t === 'deep' || h.t === 'ford') && (c + r) % 2 === 0) dg('<path d="M-10 0 Q-5 -4 0 0 T10 0" class="d-wave"/>');
      else if (h.t === 'shoal') dg('<circle r="2" cx="-5" cy="2" class="d-shoal"/><circle r="1.6" cx="4" cy="-3" class="d-shoal"/>');
      if (h.flow) dg(`<path d="${V.B.flowDir > 0 ? 'M-6 -12 H6 L2 -15 M6 -12 L2 -9' : 'M6 -12 H-6 L-2 -15 M-6 -12 L-2 -9'}" class="d-flow"/>`);
    }
  }

  function render() {
    const { B, root } = V;
    // 부대
    const have = new Map([...V.lay.units.children].map(g => [+g.dataset.id, g]));
    for (const u of B.units) {
      let g = have.get(u.id);
      if (u.dead) { if (g) { g.classList.add('gone'); setTimeout(() => g.remove(), 600); have.delete(u.id); } continue; }
      if (!g) {
        g = el('g', { class: 'tb-u', 'data-id': u.id }, V.lay.units);
        g.addEventListener('click', (e) => { e.stopPropagation(); onUnit(u); });
        g.addEventListener('mouseenter', () => { showCard(u); });
        const col = GD.FAC[u.fac].color;
        g.innerHTML = `<g class="tb-ui"><circle r="17" class="tb-ubase" fill="${col}"/>${u.cmdr ? '<circle r="20" class="tb-cmdr"/>' : ''}
          <text class="tb-uch" y="5">${u.ch}</text><g class="tb-utype" transform="translate(12 -12)"><circle r="7"/><text y="3">${UT[u.type].glyph}</text></g>
          <rect x="-16" y="19" width="32" height="4" class="tb-hpbg"/><rect x="-16" y="19" width="32" height="4" class="tb-hpf"/><text class="tb-un" y="33"></text></g>`;
      }
      const [x, y] = px(u.c, u.r);
      if (!g._moving) g.setAttribute('transform', `translate(${x} ${y})`);
      g.classList.toggle('done', u.done && B.side === u.side);
      g.classList.toggle('rout', u.rout);
      g.classList.toggle('sel', V.sel === u);
      g.classList.toggle('conf', u.st.conf > 0);
      g.classList.toggle('burn', u.st.fire > 0);
      g.classList.toggle('guard', !!(u.st.shield || u.st.spearwall));
      g.classList.toggle('hide', !!u.st.hide);
      g.classList.toggle('buff', !!(u.st.rbuff || u.st.diehard || u.st.baesu));
      g.querySelector('.tb-hpf').setAttribute('width', (32 * clamp(u.n / u.n0, 0, 1)).toFixed(1));
      g.querySelector('.tb-un').textContent = UT[u.type].sea ? `${Math.max(1, R(u.n))}척` : (u.n >= 10000 ? (u.n / 10000).toFixed(1) + '만' : R(u.n).toLocaleString());
    }
    // 위쪽 막대
    const tot = (s) => B.units.filter(u => u.side === s && !u.fixed).reduce((t, u) => t + u.n * (UT[u.type].per || 1), 0);
    const tot0 = (s) => B.units.filter(u => u.side === s && !u.fixed).reduce((t, u) => t + u.n0 * (UT[u.type].per || 1), 0);
    for (const s of ['A', 'D']) {
      root.querySelector('#tbBar' + s).style.width = (100 * tot(s) / Math.max(1, tot0(s))).toFixed(1) + '%';
      const ships = B.kind === 'sea' ? B.units.filter(u => u.side === s && !u.dead && !u.fixed).reduce((t, u) => t + Math.max(1, R(u.n)), 0) : 0;
      root.querySelector('#tbNum' + s).textContent = B.kind === 'sea' ? `${ships}척` : R(tot(s)).toLocaleString() + '명';
    }
    root.querySelector('#tbDay').textContent = `${Math.min(B.day, B.maxDay)}일째 / ${B.maxDay}일`;
    root.querySelector('#tbPhase').textContent = B.over ? '전투 끝' : `${GD.FAC[B.fac[B.side]].name}군 차례${V.player === B.side && !V.delegated ? ' · 명령하세요' : ''}`;
    // 목록·기록
    root.querySelector('#tbUnits').innerHTML = ['A', 'D'].map(s => `<div class="tb-ulist" style="--fc:${GD.FAC[B.fac[s]].color}"><h4>${GD.FAC[B.fac[s]].name} ${s === 'A' ? '공격군' : '수비군'}</h4>` +
      B.units.filter(u => u.side === s).map(u => `<div style="--uc:${GD.FAC[u.fac].color}" class="tb-urow${u.dead ? ' dead' : ''}${u.rout ? ' rout' : ''}${V.sel === u ? ' sel' : ''}" data-id="${u.id}"><span class="tb-uicon">${u.ch}</span><span class="nm">${u.cmdr ? '★' : ''}${u.name}<small>${UT[u.type].name}</small></span><span class="n">${u.dead ? '궤멸' : UT[u.type].sea ? Math.max(1, R(u.n)) + '척' : R(u.n).toLocaleString()}</span><i style="width:${(100 * clamp(u.n / u.n0, 0, 1)).toFixed(0)}%"></i></div>`).join('') + '</div>').join('');
    for (const row of root.querySelectorAll('.tb-urow')) row.addEventListener('click', () => { const u = B.units.find(x => x.id === +row.dataset.id); if (u && !u.dead) onUnit(u); });
    root.querySelector('#tbLog').innerHTML = B.log.slice(0, 40).map(l => `<div class="${l.cls || ''}"><b>${l.day}일</b> ${l.text}</div>`).join('');
    // 칸 표시
    V.lay.hp.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const h = B.grid[r][c];
      if (!h.hpMax) continue;
      const [x, y] = px(c, r);
      const g = el('g', { transform: `translate(${x} ${y})`, class: 'hpbar' }, V.lay.hp);
      g.innerHTML = `<rect x="-11" y="12" width="22" height="3" class="d-hpbg"/><rect x="-11" y="12" width="${(22 * h.hp / h.hpMax).toFixed(1)}" height="3" class="d-hp"/>`;
    }
    const isMine = V.player && B.side === V.player && !V.delegated && !B.over;
    root.querySelector('#tbEnd').disabled = !isMine;
    root.querySelector('#tbWait').disabled = !(isMine && V.sel);
    const acts = V.sel ? actsOf(B, V.sel) : [];
    root.querySelector('#tbAct').disabled = !(isMine && V.sel && acts.length);
    root.querySelector('#tbAct').textContent = acts.length ? `전법 ${acts.filter(id => !actBlocked(B, V.sel, id)).length}/${acts.length}` : '전법';
    root.querySelector('#tbAuto').disabled = !V.player || V.delegated || !!B.over;
    root.querySelector('#tbInstant').disabled = !!B.over || V.instant;
    root.querySelector('#tbRetreat').disabled = !isMine;
    if (V.sel) showCard(V.sel);
    hint();
  }
  function hint() {
    const { B, root } = V;
    let t = '';
    if (B.over) t = '전투가 끝났습니다.';
    else if (!V.player) t = '컴퓨터끼리 싸우고 있습니다.';
    else if (V.delegated) t = '위임 중입니다. 컴퓨터가 대신 지휘합니다.';
    else if (B.side !== V.player) t = '적이 움직이고 있습니다…';
    else if (V.mode === 'act') t = `${GD.ACTS[V.actId].name}: 대상을 고르세요. (빈 곳을 누르면 취소)`;
    else if (V.sel) t = `${V.sel.name} — 파란 칸으로 이동, 붉은 고리의 적을 누르면 공격${B.castle && V.player === 'A' ? ', 주황 고리는 성벽·성문 공격' : ''}. 적을 바로 누르면 알맞은 자리로 가서 공격합니다.`;
    else t = '움직일 부대를 고르세요. 모두 움직였거나 끝내려면 [차례 마침]을 누르세요.';
    root.querySelector('#tbHint').textContent = t;
  }
  function showCard(u) {
    const { B, root } = V;
    const ut = UT[u.type];
    const h = B.grid[u.r][u.c];
    const pid = u.gen ? (GD.PEOPLE_ID[u.gen] || u.gen) : null;
    const life = pid && typeof PEOPLE !== 'undefined' ? PEOPLE.find(p => p.id === pid) : null;
    root.querySelector('#tbCard').innerHTML = `
      <div class="tb-cardhead" style="--fc:${GD.FAC[u.fac].color}"><span class="pt">${u.ch}</span><div><b>${u.cmdr ? '★ ' : ''}${u.name}</b><small>${GD.FAC[u.fac].name} · ${ut.name}${life ? ' · ' + life.role : ''}</small></div></div>
      <dl class="tb-stats">
        <dt>${ut.sea ? '배' : '병력'}</dt><dd>${ut.sea ? Math.max(0, R(u.n)) + '척 / ' + u.n0 + '척' : R(u.n).toLocaleString() + ' / ' + R(u.n0).toLocaleString()}</dd>
        <dt>사기</dt><dd><span class="bar"><i style="width:${u.mo}%"></i></span>${R(u.mo)}${u.rout ? ' (패주)' : ''}</dd>
        <dt>훈련</dt><dd>${R(u.tr)}</dd>
        <dt>통솔·무력·지력</dt><dd>${u.lea} · ${u.war} · ${u.int}</dd>
        <dt>이동·사거리</dt><dd>${ut.mp} · ${ut.rng}</dd>
        ${u.skills.length ? `<dt>특기</dt><dd>${u.skills.map(s => GD.SKILLS[s]).join(', ')}</dd>` : ''}
        ${statusText(u) ? `<dt>상태</dt><dd>${statusText(u)}</dd>` : ''}
      </dl>
      <div class="tb-acts">${actsOf(B, u).map(id => { const A = GD.ACTS[id], w = actWait(B, u, id); return `<span class="tb-act${w ? ' wait' : ''}" title="${A.desc}">${A.name}${w ? ` <small>${w}일</small>` : ''}</span>`; }).join('') || '<span class="muted">전법 없음</span>'}</div>
      <p class="tb-note">${unitNote(u)}</p>`;
    root.querySelector('#tbHex').innerHTML = `<b>${T[h.t].name}</b> — 방어 ×${(((h.t === 'wall' || h.t === 'gate') && u.side === B.castleSide) ? WALL_DEF[B.castle][h.t] : T[h.t].def || 1).toFixed(2)}${h.hpMax ? ` · 내구 ${R(h.hp)}/${h.hpMax}` : ''}`;
  }
  function statusText(u) {
    const st = u.st, out = [];
    if (st.shield) out.push('방패진');
    if (st.spearwall) out.push('장창진');
    if (st.hide) out.push('매복');
    if (st.diehard) out.push('결사');
    if (st.baesu) out.push('배수진');
    if (st.rbuff) out.push(`사격 ×${st.rmul}`);
    if (st.mark) out.push('빈틈');
    if (st.conf) out.push('혼란');
    if (st.fire) out.push('불길');
    return out.join(' · ');
  }
  function unitNote(u) {
    const n = {
      inf: '창과 칼로 싸우는 보병. 성벽을 오르거나 성문을 부술 때 앞장선다.',
      spear: '긴 창을 든 아시가루. 기병의 돌격을 잘 막는다.',
      cav: '평지에서 돌격하면 강하지만 논·숲·산에서는 힘을 쓰지 못한다. (탄금대의 교훈)',
      bow: '조선의 각궁과 편전은 조총보다 멀리 나간다(사거리 3). 다만 한 번의 위력은 약하다.',
      gun: '조총 사격은 위력이 크고 적의 사기를 크게 떨어뜨린다. 사거리 2.',
      cannon: '총통·불랑기포. 멀리 쏘고 성벽과 성문을 잘 부순다. 맞붙어 싸우면 약하다.',
      uib: '고향 산천을 잘 아는 의병. 숲·산에서 빠르고 강하다.',
      monk: '승병. 쉽게 무너지지 않는다.',
      panok: '판옥선. 높은 갑판에서 총통을 쏜다(사거리 2). 일본 배가 붙지 못하게 거리를 두고 싸우는 것이 좋다.',
      turtle: '거북선. 지붕을 덮어 적이 배에 오를 수 없다. 적진에 뛰어들어 들이받고 포를 쏜다.',
      atake: '일본의 큰 배. 배를 붙여 건너오는 칼싸움(등선육박전)이 특기.',
      seki: '빠른 일본 배. 재빨리 다가와 배에 오르려 한다. 불에 약하다.',
      mship: '명 수군의 전선.',
      fort: '바닷가 포대. 움직이지 않고 가까운 배를 쏜다.',
    };
    return n[u.type] || '';
  }

  // ── 플레이어 입력
  function onUnit(u) {
    const { B } = V;
    if (B.over) return;
    showCard(u);
    if (!V.player || V.delegated || B.side !== V.player) return;
    if (V.mode === 'act') { if (u.side !== V.player) return useActOn(u); V.mode = null; }
    if (u.side === V.player) {
      if (u.done || u.ally) { deselect(); showCard(u); return; }
      select(u);
    } else if (V.sel) attackTarget(u);
  }
  function select(u) { V.sel = u; V.mode = null; V.R = reachable(V.B, u); highlight(); render(); }
  function deselect() { V.sel = null; V.R = null; V.mode = null; V.lay.hl.innerHTML = ''; render(); }
  function highlight() {
    const { B } = V; const u = V.sel;
    V.lay.hl.innerHTML = '';
    if (!u) return;
    if (!u.moved) for (const h of V.R.values()) {
      if (h.c === u.c && h.r === u.r) continue;
      const [x, y] = px(h.c, h.r);
      const p = el('polygon', { points: hexPts(x, y, HR - 2), class: 'tb-move' }, V.lay.hl);
      p.addEventListener('click', () => onHex(h.c, h.r));
    }
    for (const e of alive(B, u.side === 'A' ? 'D' : 'A')) {
      const k = bestKind(B, u, u, e);
      const reachable2 = !k && !u.moved && [...V.R.values()].some(h => bestKind(B, u, h, e));
      if (!k && !reachable2) continue;
      const [x, y] = px(e.c, e.r);
      const ring = el('circle', { cx: x, cy: y, r: 22, class: 'tb-tgt' + (k ? '' : ' far') }, V.lay.hl);
      ring.addEventListener('click', (ev) => { ev.stopPropagation(); attackTarget(e); });
      if (k) { const men = dmgMen(B, u, e, k, true); const t = el('text', { x, y: y - 24, class: 'tb-est' }, V.lay.hl); t.textContent = `-${UT[e.type].sea ? Math.max(0.1, men / (UT[e.type].per || 1)).toFixed(1) + '척' : R(men).toLocaleString()}`; }
    }
    if (B.castle && u.side !== B.castleSide) {
      for (const [x0, y0] of nbsWithin(u.c, u.r, UT[u.type].ratk > 0 ? UT[u.type].rng : 1)) {
        const g = B.grid[y0][x0];
        if (!(g.t === 'wall' || g.t === 'gate') || unitAt(B, x0, y0)) continue;
        const [x, y] = px(x0, y0);
        const ring = el('circle', { cx: x, cy: y, r: 21, class: 'tb-wtgt' }, V.lay.hl);
        ring.addEventListener('click', (ev) => { ev.stopPropagation(); doAction({ wall: [x0, y0] }); });
      }
    }
  }
  async function onHex(c, r) {
    const { B } = V;
    hoverHex(c, r);
    if (!V.sel || B.over || V.mode === 'act') { if (V.mode === 'act') { V.mode = null; highlight(); render(); } return; }
    const o = unitAt(B, c, r);
    if (o && o.side !== V.sel.side) return attackTarget(o);
    if (o && o.side === V.sel.side) return o.done ? null : select(o);
    if (V.sel.moved) return;
    const k = key(c, r);
    if (!V.R.has(k)) { deselect(); return; }
    const u = V.sel;
    const ev = [{ t: 'move', u, path: pathOf(V.R, k) }];
    u.c = c; u.r = r; u.moved = true;
    afterMove(B, u);
    await playEvents(ev);
    V.R = reachable(B, u);
    const anyTarget = alive(B, u.side === 'A' ? 'D' : 'A').some(e => bestKind(B, u, u, e)) || (B.castle && u.side !== B.castleSide && nbsWithin(u.c, u.r, UT[u.type].ratk > 0 ? UT[u.type].rng : 1).some(([x, y]) => ['wall', 'gate'].includes(B.grid[y][x].t) && !unitAt(B, x, y)));
    if (!anyTarget && !actsOf(B, u).some(id => !actBlocked(B, u, id))) { u.done = true; deselect(); maybeAutoEnd(); return; }
    highlight(); render();
  }
  function hoverHex(c, r) {
    const { B } = V; const h = B.grid[r][c];
    V.root.querySelector('#tbHex').innerHTML = `<b>${T[h.t].name}</b> — 방어 ×${(T[h.t].def || 1).toFixed(2)}, 이동 ${T[h.t].cost >= 99 ? '불가' : T[h.t].cost}${h.hpMax ? ` · 내구 ${R(h.hp)}/${h.hpMax}` : ''}${h.flow ? ' · 물살 ' + (B.flowDir > 0 ? '→' : '←') : ''}`;
  }
  async function attackTarget(e) {
    const { B } = V; const u = V.sel;
    if (!u || u.done) return;
    let k = bestKind(B, u, u, e);
    if (k) return doAction({ target: e, kind: k });
    if (u.moved) return;
    let best = null, bs = -1e9;
    const foes = alive(B, u.side === 'A' ? 'D' : 'A');
    for (const h of V.R.values()) {
      const kk = bestKind(B, u, h, e);
      if (!kk) continue;
      const s = dmgMen(B, u, e, kk, true, h) + positional(B, u, h, foes) * 0.5;
      if (s > bs) { bs = s; best = { h, kk }; }
    }
    if (!best) return;
    doAction({ to: best.h, target: e, kind: best.kk });
  }
  async function doAction(a) {
    const u = V.sel; if (!u) return;
    V.lay.hl.innerHTML = '';
    const ev = act(V.B, u, a);
    V.sel = null; V.R = null;
    await playEvents(ev);
    render();
    if (V.B.over) { if (V.phaseResolve) V.phaseResolve(); return; }
    maybeAutoEnd();
  }
  function actMenu() {
    const u = V.sel; if (!u) return;
    const B = V.B;
    const float = V.root.querySelector('#tbFloat');
    const items = actsOf(B, u).map(id => {
      const A = GD.ACTS[id], why = actBlocked(B, u, id);
      const tag = GD.TYPE_ACTS[u.type].includes(id) ? '병종' : (GD.GEN_ACTS[u.gen] || []).includes(id) ? '고유' : '계략';
      return `<button data-a="${id}" ${why ? 'disabled' : ''}><b>${A.name}</b> <i>${A.hanja} · ${tag}</i>${why ? `<em>${why}</em>` : ''}<small>${A.desc}</small></button>`;
    }).join('');
    float.innerHTML = `<div class="tb-menu"><b>${u.name} 부대의 전법</b>${items || '<p class="muted">쓸 수 있는 전법이 없습니다.</p>'}<button data-a="x" class="x">닫기</button></div>`;
    float.classList.add('on');
    for (const b of float.querySelectorAll('button')) b.addEventListener('click', () => {
      float.classList.remove('on'); float.innerHTML = '';
      const id = b.dataset.a;
      if (id === 'x') return;
      if (!needsTarget(id)) return doAction({ act: id });
      V.mode = 'act'; V.actId = id;
      V.lay.hl.innerHTML = '';
      const A = GD.ACTS[id];
      for (const e of actTargets(B, u, id)) {
        const [x, y] = px(e.c, e.r);
        const ring = el('circle', { cx: x, cy: y, r: 22, class: 'tb-tgt act' }, V.lay.hl);
        ring.addEventListener('click', (ev) => { ev.stopPropagation(); useActOn(e); });
        const tx = el('text', { x, y: y - 24, class: 'tb-est' }, V.lay.hl);
        if (A.kind === 'hit') { const men = dmgMen(B, u, e, A.ranged ? 'ranged' : 'melee', true, null, Object.assign({ id }, A)); tx.textContent = `-${UT[e.type].sea ? Math.max(0.1, men / (UT[e.type].per || 1)).toFixed(1) + '척' : R(men).toLocaleString()}`; }
        else tx.textContent = `${R(trickOdds(B, u, id, e) * 100)}%`;
      }
      for (const [x0, y0] of actWalls(B, u, id)) {
        const [x, y] = px(x0, y0);
        const ring = el('circle', { cx: x, cy: y, r: 21, class: 'tb-wtgt' }, V.lay.hl);
        ring.addEventListener('click', (ev) => { ev.stopPropagation(); V.mode = null; doAction({ act: id, wall: [x0, y0] }); });
      }
      hint();
    });
  }
  function useActOn(e) {
    const id = V.actId; V.mode = null;
    if (!V.sel || !actTargets(V.B, V.sel, id).includes(e)) { highlight(); render(); return; }
    doAction({ act: id, target: e });
  }
  function maybeAutoEnd() {
    const { B } = V;
    if (!V.player || B.side !== V.player || V.delegated) return;
    if (alive(B, V.player).every(u => u.done || u.fixed || u.ally)) setTimeout(() => endPlayerPhase(), 350);
  }
  function endPlayerPhase() { deselect(); if (V.phaseResolve) { const r = V.phaseResolve; V.phaseResolve = null; r(); } }

  // ── 애니메이션
  async function playEvents(ev) {
    if (V.instant) return;
    const sp = V.speed;
    for (const e of ev) {
      if (e.t === 'move') await tweenMove(e.u, e.path, sp);
      else if (e.t === 'hit') await shot(e, sp);
      else if (e.t === 'wall') await wallFx(e, sp);
      else if (e.t === 'trick') await trickFx(e, sp);
      else if (e.t === 'act') await actFx(e, sp);
      else if (e.t === 'breach') { drawTerrain(); }
    }
  }
  function tweenMove(u, path, sp) {
    const g = V.lay.units.querySelector(`[data-id="${u.id}"]`);
    if (!g || path.length < 2) return Promise.resolve();
    g._moving = true;
    const pts = path.map(([c, r]) => px(c, r));
    const per = 110 / sp;
    return new Promise(res => {
      let finished = false;
      // 탭이 가려져 화면 갱신이 멈춰도 이동은 끝나도록 시간으로도 마무리한다
      const finish = () => {
        if (finished) return;
        finished = true;
        const [xe, ye] = pts[pts.length - 1];
        g.setAttribute('transform', `translate(${xe} ${ye})`);
        g._moving = false; res();
      };
      const t0 = performance.now();
      const step = (t) => {
        if (finished) return;
        const k = Math.max(0, (t - t0) / per), i = Math.min(pts.length - 2, Math.floor(k)), f = Math.min(1, k - i);
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        g.setAttribute('transform', `translate(${x1 + (x2 - x1) * f} ${y1 + (y2 - y1) * f})`);
        if (k < pts.length - 1) requestAnimationFrame(step); else finish();
      };
      requestAnimationFrame(step);
      setTimeout(finish, per * (pts.length - 1) + 300);
    });
  }
  function shot(e, sp) {
    const a = e.from, d = e.to;
    if (!d) return Promise.resolve();
    const [x2, y2] = px(d.c, d.r);
    const fx = V.lay.fx;
    if (a) {
      const [x1, y1] = px(a.c, a.r);
      const cls = e.kind === 'melee' ? 'melee' : a.type === 'gun' ? 'gun' : a.type === 'bow' ? 'arrow' : 'cannon';
      const ln = el('line', { x1, y1, x2, y2, class: 'tb-shot ' + cls }, fx);
      setTimeout(() => ln.remove(), 380 / sp);
    }
    const boom = el('circle', { cx: x2, cy: y2, r: 6, class: 'tb-boom ' + (e.kind || '') }, fx);
    setTimeout(() => boom.remove(), 500 / sp);
    if (e.men > 0) {
      const t = el('text', { x: x2, y: y2 - 20, class: 'tb-dmg' }, fx);
      t.textContent = UT[d.type].sea ? `-${e.x.toFixed(1)}척` : `-${e.men.toLocaleString()}`;
      setTimeout(() => t.remove(), 900 / sp);
    }
    const g = V.lay.units.querySelector(`[data-id="${d.id}"]`);
    if (g) { g.classList.add('shake'); setTimeout(() => g.classList.remove('shake'), 300); }
    render();
    return sleep(330 / sp);
  }
  function wallFx(e, sp) {
    const [x, y] = px(e.c, e.r);
    const [x1, y1] = px(e.u.c, e.u.r);
    const ln = el('line', { x1, y1, x2: x, y2: y, class: 'tb-shot cannon' }, V.lay.fx);
    const b = el('circle', { cx: x, cy: y, r: 9, class: 'tb-boom wall' }, V.lay.fx);
    setTimeout(() => { ln.remove(); b.remove(); }, 420 / sp);
    render();
    return sleep(320 / sp);
  }
  function trickFx(e, sp) {
    const tg = e.to || e.u;
    const [x, y] = px(tg.c, tg.r);
    const t = el('text', { x, y: y - 22, class: 'tb-trick' + (e.ok ? '' : ' fail') }, V.lay.fx);
    t.textContent = (e.tk === 'fire' ? '🔥' : e.tk === 'conf' ? '🌀' : e.tk === 'lure' ? '🎣' : '✨') + (e.ok ? '' : ' 실패');
    setTimeout(() => t.remove(), 900 / sp);
    render();
    return sleep(450 / sp);
  }

  function actFx(e, sp) {
    const A = GD.ACTS[e.id];
    const [x, y] = px(e.u.c, e.u.r);
    const t = el('text', { x, y: y - 28, class: 'tb-actname' }, V.lay.fx);
    t.textContent = A.name;
    setTimeout(() => t.remove(), 1100 / sp);
    if (A.kind === 'aura' || e.id === 'nightraid') {
      const ring = el('circle', { cx: x, cy: y, r: Math.max(1, A.rng || 1) * HW * 0.95, class: 'tb-aura' }, V.lay.fx);
      setTimeout(() => ring.remove(), 900 / sp);
    }
    render();
    return sleep((A.kind === 'hit' ? 220 : 480) / sp);
  }

  // ── 흐름
  async function loop() {
    const { B } = V;
    if (B.over) return showResult();
    startPhase(B, 'A');
    while (!B.over) {
      const s = B.side;
      render();
      if (V.instant) { finish(B); break; }
      if (V.player === s && !V.delegated) {
        await new Promise(res => { V.phaseResolve = res; render(); });
        for (const u of order(B, s).filter(x => x.ally)) {
          if (B.over || V.instant) break;
          const ev = act(B, u, aiChoose(B, u));
          await playEvents(ev);
          if (!V.instant) render();
        }
      } else {
        if (aiShouldRetreat(B, s)) { retreat(B, s); break; }
        for (const u of order(B, s)) {
          if (B.over || V.instant) break;
          const a = aiChoose(B, u);
          const ev = act(B, u, a);
          await playEvents(ev);
          if (!V.instant) render();
        }
        if (!V.instant) await sleep(200 / V.speed);
      }
      if (B.over) break;
      if (V.instant) { finish(B); break; }
      if (s === 'D') { endDay(B); drawTerrain(); if (B.over) break; startPhase(B, 'A'); }
      else startPhase(B, 'D');
    }
    render();
    showResult();
  }
  function showResult() {
    const { B, root } = V;
    const res = result(B);
    const pSide = V.player;
    const won = pSide ? (B.over.win === pSide) : null;
    const box = root.querySelector('#tbResult');
    const lossOf = (s) => B.kind === 'land'
      ? (B.units.filter(u => u.side === s && !u.fixed).reduce((t, u) => t + u.n0 - (u.dead ? 0 : u.n), 0))
      : B.units.filter(u => u.side === s && !u.fixed).reduce((t, u) => t + u.n0 - (u.dead ? 0 : Math.floor(u.n + 0.3)), 0);
    const unit = B.kind === 'land' ? '명' : '척';
    const fates = [...res.att.gens, ...res.def.gens].filter(g => g.fate !== 'ok').map(g => `${GD.GENS[g.id].name} ${g.fate === 'dead' ? '전사' : '포로'}`);
    const winFac = GD.FAC[B.fac[B.over.win]];
    box.innerHTML = `<div class="tb-rbox ${won === true ? 'win' : won === false ? 'lose' : ''}">
      <div class="tb-rseal" style="--fc:${winFac.color}">${won === true ? '勝' : won === false ? '敗' : winFac.seal}</div>
      <h3>${won === true ? '승리' : won === false ? '패배' : winFac.name + '군 승리'}</h3>
      <p class="why">${Game.josa(B.over.why)} (${res.days}일)</p>
      <table><tr><th></th><th>${GD.FAC[B.fac.A].name} (공격)</th><th>${GD.FAC[B.fac.D].name} (수비)</th></tr>
      <tr><td>잃은 ${B.kind === 'land' ? '군사' : '배'}</td><td>${R(lossOf('A')).toLocaleString()}${unit}</td><td>${R(lossOf('D')).toLocaleString()}${unit}</td></tr></table>
      ${fates.length ? `<p class="fates">${fates.join(' · ')}</p>` : ''}
      ${V.hist ? `<div class="tb-hist">${V.hist}</div>` : ''}
      <button class="btn primary" id="tbDone">계속</button></div>`;
    box.classList.remove('hidden');
    box.querySelector('#tbDone').addEventListener('click', () => { const r = V.resolve; V = null; r(res); });
  }

  return { run, simulate, setup, defaultType, genActIds, UT, T, get last() { return TB_last; } };
})();

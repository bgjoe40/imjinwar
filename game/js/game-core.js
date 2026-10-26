// 칠년전쟁 — 게임 상태와 규칙 (명령·전투 결과 반영·월말 처리·보급·저장)
const Game = (() => {
  const C = GD.CITIES, G = GD.GENS;
  const SAVE_KEY = 'imjin_game_';
  let S = null;
  // 화면 쪽에서 채우는 연결 고리: battle(spec) → 결과, animate(경로, 세력), change() 화면 갱신
  const hooks = { battle: null, animate: null, change: null };

  // ── 길과 포구
  const ADJ = {};
  for (const [a, b, cost, name, kind] of GD.LINKS) {
    (ADJ[a] = ADJ[a] || []).push({ to: b, cost, name, sea: kind === 'sea' });
    (ADJ[b] = ADJ[b] || []).push({ to: a, cost, name, sea: kind === 'sea' });
  }
  const PORTS = {};
  for (const [id, c] of Object.entries(C)) if (c.port) (PORTS[c.port] = PORTS[c.port] || []).push(id);
  const KOREA = Object.keys(C).filter(id => !C[id].foreign);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = Math.round;
  const ally = (a, b) => a === b || (a !== 'japan' && b !== 'japan');
  const has = (id, sk) => G[id].skills.includes(sk);
  const ym = (y, m) => y * 12 + m - 1;
  const nowYm = () => ym(S.y, S.m);
  const STEMS = '갑을병정무기경신임계', BRANCH = '자축인묘진사오미신유술해';
  const ganji = (y) => STEMS[(y - 4) % 10] + BRANCH[(y - 4) % 12];
  const fmt = (n) => n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '만' : String(R(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // 조사 고르기: '한양을(를)' → '한양을', '부산이(가)' → '부산이'
  function josa(text) {
    return String(text).replace(/([가-힣])(이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)로)/g, (m, ch, p) => {
      const jong = (ch.charCodeAt(0) - 0xac00) % 28;
      if (p === '(으)로') return ch + (jong && jong !== 8 ? '으로' : '로');
      const [a, b] = p.replace(')', '').split('(');
      return ch + (jong ? a : b);
    });
  }
  function log(text, kind = 'info', at) {
    text = josa(text);
    S.log.push({ y: S.y, m: S.m, text, kind, at });
    if (S.log.length > 500) S.log.splice(0, S.log.length - 500);
  }

  // ── 새 게임
  const DEF_Q = { joseon: [40, 55], japan: [85, 85], ming: [70, 70] };
  function newGame(scenId, diff = 'normal') {
    const sc = GD.SCEN[scenId];
    const jk = diff === 'hard' ? 1.15 : diff === 'easy' ? 0.85 : 1;
    S = {
      v: 1, scen: scenId, diff, y: sc.start[0], m: sc.start[1], step: 1, turn: 1, phase: 'opening',
      gold: Object.assign({}, sc.gold), cities: {}, gens: {}, fleets: [], fid: 1,
      uib: {}, uibPush: {}, aid: 0, reforms: {}, flags: {}, done: {}, capital: 'hanyang', log: [],
      stats: { won: 0, lost: 0, kills: 0, losses: 0, great: [], lostCities: 0 },
    };
    if (diff === 'easy') S.gold.joseon += 1500;
    for (const r of sc.reforms || []) S.reforms[r] = true;
    for (const id of Object.keys(C)) {
      const b = C[id], d = sc.cities[id] || { o: 'joseon', t: 0, g: [] };
      const q = DEF_Q[d.o];
      S.cities[id] = {
        o: d.o, t: R(d.t * (d.o === 'japan' ? jk : 1)), tr: d.tr ?? q[0], mo: d.mo ?? q[1],
        f: d.f ?? R(d.t * 3 + b.farm * b.pop * 6),
        wall: d.wall ?? b.wall, castle: d.castle || b.castle,
        farm: b.farm, trade: b.trade, pop: b.pop,
        order: d.o === 'joseon' ? 65 : d.o === 'japan' ? 30 : 50,
        ships: Object.assign({}, d.s || {}), dele: false, burnt: false,
      };
      if (S.reforms.sanseong && S.cities[id].castle === 'san') S.cities[id].wall += 15;
    }
    for (const id of Object.keys(G)) S.gens[id] = { st: 'off', city: null, fleet: null, acted: false };
    for (const [cid, d] of Object.entries(sc.cities)) for (const g of d.g || []) Object.assign(S.gens[g], { st: 'on', city: cid });
    for (const g of sc.dead || []) S.gens[g].st = 'dead';
    for (const k of Object.keys(GD.DO)) { S.uib[k] = 0; S.uibPush[k] = 0; }
    S.waves = (sc.waves || []).map(w => Object.assign({}, w, { t: R(w.t * jk), done: false }));
    log(`${sc.title} 시나리오를 시작합니다.`, 'sys');
    return S;
  }

  // ── 조회
  const city = (id) => S.cities[id];
  function gensIn(cid, withKing) {
    return Object.keys(S.gens).filter(g => S.gens[g].st === 'on' && S.gens[g].city === cid && (withKing || !has(g, 'king')));
  }
  const gensOf = (fac) => Object.keys(S.gens).filter(g => S.gens[g].st === 'on' && G[g].fac === fac);
  const lead = (ids) => ids.length ? Math.max(...ids.map(g => G[g].lea)) : 40;
  const citiesOf = (fac) => KOREA.filter(id => S.cities[id].o === fac);
  const neighbors = (id) => (ADJ[id] || []).map(e => e.to);
  const landNeighbors = (id) => (ADJ[id] || []).filter(e => !e.sea).map(e => e.to);
  const totalShips = (s) => Object.values(s || {}).reduce((a, b) => a + b, 0);

  const CASTLE_K = { eup: 2.2, san: 2.8, wae: 3.5 };
  const wallMax = (c) => (c.castle === 'wae' ? 120 : c.castle === 'san' ? 110 : 100) + (S.reforms.sanseong && c.castle === 'san' ? 15 : 0);
  const wallK = (c) => 1 + (c.wall / 100) * (CASTLE_K[c.castle] || 0.8);
  const forceQ = (troops, gens, tr, mo) => troops * (0.6 + lead(gens) / 200) * (0.5 + tr / 200) * (0.5 + mo / 200);
  const defPower = (cid) => { const c = S.cities[cid]; return forceQ(c.t, gensIn(cid), c.tr, c.mo) * wallK(c); };
  const trainCap = (fac) => fac === 'joseon' ? (S.reforms.hullyeon ? 90 : 70) : fac === 'ming' ? 90 : 100;
  const isTruce = () => !!S.flags.truce;

  // 이동력: 1592년 일본군 선봉은 빠르게 북상했다
  function mpOf(fac, gens) {
    const t = nowYm();
    let mp = 3;
    if (fac === 'japan' && t === ym(1592, 4)) mp = 3;
    else if (fac === 'japan' && t <= ym(1592, 6)) mp = 5;
    else if (fac === 'japan' && t >= ym(1597, 7) && t <= ym(1597, 9)) mp = 4;
    if (gens.length && gens.every(g => has(g, 'cav'))) mp += 1;
    return mp;
  }

  // 갈 수 있는 곳: 자기 성은 지나가고, 동맹 성은 지나가기만, 적 성은 공격 목표로 그 앞에서 멈춘다
  function reach(from, fac, mp) {
    const dist = { [from]: 0 }, prev = {}, kind = {}, sea = {};
    const pq = [[0, from]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [d, u] = pq.shift();
      if (d > dist[u]) continue;
      if (u !== from && kind[u] === 'attack') continue;
      for (const e of ADJ[u] || []) {
        const v = e.to, cv = S.cities[v];
        if (e.sea && fac !== 'japan') continue;
        if (C[v].foreign && cv.o !== fac) continue;
        if (C[v].naval) continue;
        const nd = d + (fac === 'ming' && cv.o === 'joseon' ? Math.max(0.5, e.cost * 0.5) : e.cost);
        if (nd > mp) continue;
        if (dist[v] !== undefined && dist[v] <= nd) continue;
        dist[v] = nd; prev[v] = u; sea[v] = e.sea;
        kind[v] = cv.o === fac ? 'move' : ally(cv.o, fac) ? 'pass' : 'attack';
        if (kind[v] === 'attack' && isTruce() && !S.flags.truceBreak) kind[v] = 'blocked';
        pq.push([nd, v]);
      }
    }
    delete dist[from];
    return { dist, prev, kind, sea };
  }
  function pathTo(r, to) {
    const p = [to];
    while (r.prev[p[0]] !== undefined) p.unshift(r.prev[p[0]]);
    return p;
  }

  // ── 바다
  function fleetsAt(zone, fac) { return S.fleets.filter(f => f.zone === zone && (!fac || f.o === fac)); }
  function anchored(zone, fac) {
    const s = {};
    for (const id of PORTS[zone] || []) {
      const c = S.cities[id];
      if (c.o !== fac) continue;
      for (const [k, n] of Object.entries(c.ships)) s[k] = (s[k] || 0) + n;
    }
    return s;
  }
  function shipsIn(zone, side) { // side: 'japan' 또는 'allied'(조선+명)
    const facs = side === 'japan' ? ['japan'] : ['joseon', 'ming'];
    let n = 0;
    for (const f of facs) {
      n += totalShips(anchored(zone, f));
      for (const fl of fleetsAt(zone, f)) n += totalShips(fl.s);
    }
    return n;
  }
  // 쓰시마에서 zone 까지 조선·명 수군에 막히지 않은 뱃길이 있는가
  function seaOpen(zone) {
    const seen = new Set(['s_daehan']), q = ['s_daehan'];
    while (q.length) {
      const z = q.shift();
      if (z === zone) return true;
      for (const n of GD.SEAS[z].adj) if (!seen.has(n) && shipsIn(n, 'allied') < 3) { seen.add(n); q.push(n); }
    }
    return false;
  }
  function seaReach(fromZone, fac, mp = 3) {
    const enemySide = fac === 'japan' ? 'allied' : 'japan';
    const dist = { [fromZone]: 0 }, prev = {}, q = [fromZone];
    while (q.length) {
      const z = q.shift();
      if (z !== fromZone && shipsIn(z, enemySide) > 0) continue; // 적 수군이 있는 곳에서는 멈춤
      for (const n of GD.SEAS[z].adj) {
        if (dist[n] !== undefined || dist[z] + 1 > mp) continue;
        dist[n] = dist[z] + 1; prev[n] = z; q.push(n);
      }
    }
    return { dist, prev };
  }

  // ── 명령
  const CMDS = {
    farm:    { cat: 'naejeong', name: '개간', cost: 60, stat: 'pol', desc: '논밭을 일구어 농업을 높인다. 가을 수확이 늘어난다.' },
    trade:   { cat: 'naejeong', name: '상업', cost: 60, stat: 'pol', desc: '장시를 살려 상업을 높인다. 다달이 들어오는 재정이 늘어난다.' },
    wall:    { cat: 'naejeong', name: '축성', cost: 90, stat: 'pol', desc: '성벽을 고쳐 쌓는다. 성을 지킬 때 유리하다.' },
    relief:  { cat: 'naejeong', name: '구휼', food: 1500, stat: 'cha', desc: '곡식 1,500석을 풀어 백성을 돌본다. 민심이 오른다.' },
    recruit: { cat: 'gunsa', name: '징병', stat: 'cha', desc: '군사를 모은다. 재정이 들고 민심이 조금 떨어진다. 새 병사는 훈련도가 낮다.' },
    train:   { cat: 'gunsa', name: '훈련', stat: 'lea', desc: '군사를 훈련해 훈련도를 높인다.' },
    uib:     { cat: 'insa', name: '창의 독려', stat: 'cha', desc: '이웃한 점령지에 격문을 보내 의병 활동을 북돋운다. 의병은 일본군의 보급로를 괴롭힌다.' },
    envoy:   { cat: 'oegyo', name: '원군 요청', stat: 'pol', desc: '명에 사신을 보내 원군을 청한다. 조정(왕이 있는 곳)에서만 할 수 있고 한 달에 한 번.' },
    joint:   { cat: 'oegyo', name: '공동 작전', stat: 'cha', desc: '명군에게 함께 칠 곳을 청한다. 명군이 조선에 와 있을 때.' },
    ship:    { cat: 'sugun', name: '판옥선 건조', cost: 0, stat: 'pol', desc: '판옥선을 만든다. 한 척에 재정 45. 포구가 있는 고을에서.' },
    turtle:  { cat: 'sugun', name: '거북선 건조', cost: 180, stat: 'int', desc: '거북선 1척을 만든다. 거북선 특기를 가진 장수가 있어야 한다.' },
  };
  const statOf = (g, k) => G[g][k];

  function canCmd(cmd, cid, g) {
    const c = S.cities[cid], d = CMDS[cmd];
    if (!g || S.gens[g].acted) return '이미 명령을 마친 장수입니다.';
    if (c.o !== 'joseon') return '조선의 고을이 아닙니다.';
    if (d.cost && S.gold.joseon < d.cost) return '재정이 모자랍니다.';
    if (cmd === 'relief' && c.f < d.food) return '군량이 모자랍니다.';
    if (cmd === 'envoy') {
      if (cid !== S.capital) return '조정이 있는 곳에서만 할 수 있습니다.';
      if (S.flags.envoyThisMonth) return '이번 달에는 이미 사신을 보냈습니다.';
      if (S.flags.mingIn && nowYm() > ym(1593, 1)) return '명군이 이미 와 있습니다.';
    }
    if (cmd === 'joint' && !citiesOf('ming').length) return '조선에 와 있는 명군이 없습니다.';
    if ((cmd === 'ship' || cmd === 'turtle') && !C[cid].port) return '포구가 없는 고을입니다.';
    if (cmd === 'ship' && S.gold.joseon < 45) return '재정이 모자랍니다.';
    if (cmd === 'turtle' && !gensIn(cid).some(x => has(x, 'turtle'))) return '거북선을 만들 줄 아는 장수가 없습니다.';
    if (cmd === 'uib' && !uibTargets(cid).length) return '이웃한 점령지가 없습니다.';
    if (cmd === 'recruit' && c.pop < 1) return '모을 백성이 없습니다.';
    if (cmd === 'train' && c.tr >= trainCap('joseon')) return '더 훈련할 수 없습니다.';
    return '';
  }
  function uibTargets(cid) {
    const out = new Set();
    for (const n of landNeighbors(cid)) if (S.cities[n].o === 'japan' && !C[n].foreign) out.add(C[n].do);
    if (S.cities[cid].o === 'joseon') for (const id of KOREA) if (C[id].do === C[cid].do && S.cities[id].o === 'japan') out.add(C[id].do);
    return [...out];
  }
  function recruitAmount(cid, g) {
    const c = S.cities[cid];
    return Math.max(100, Math.min(R((400 + statOf(g, 'cha') * 14) * c.order / 100 * (S.reforms.sogo ? 1.4 : 1)), R(c.pop * 600)));
  }

  function doCmd(cmd, cid, g, arg) {
    const why = canCmd(cmd, cid, g);
    if (why) return { ok: false, msg: why };
    const c = S.cities[cid], d = CMDS[cmd], nm = G[g].name, cn = C[cid].name;
    let msg = '';
    if (d.cost) S.gold.joseon -= d.cost;
    const boost = (sk) => has(g, sk) ? 1.5 : 1;
    switch (cmd) {
      case 'farm': { const v = R((2 + statOf(g, 'pol') / 14) * boost('admin')); c.farm = Math.min(100, c.farm + v); msg = `${nm}이(가) ${cn}의 농업을 ${v} 높였습니다.`; break; }
      case 'trade': { const v = R((2 + statOf(g, 'pol') / 14) * boost('admin')); c.trade = Math.min(100, c.trade + v); msg = `${nm}이(가) ${cn}의 상업을 ${v} 높였습니다.`; break; }
      case 'wall': {
        const v = R((3 + (statOf(g, 'pol') + statOf(g, 'lea')) / 40) * boost('build') * (S.reforms.sanseong && c.castle === 'san' ? 1.3 : 1));
        c.wall = Math.min(wallMax(c), c.wall + v); msg = `${nm}이(가) ${cn}의 성벽을 ${v} 보강했습니다.`; break;
      }
      case 'relief': { c.f -= d.food; const v = R(3 + statOf(g, 'cha') / 12); c.order = Math.min(100, c.order + v); msg = `${cn}에서 곡식을 풀어 민심이 ${v} 올랐습니다.`; break; }
      case 'recruit': {
        const n = recruitAmount(cid, g), cost = R(n / 7);
        if (S.gold.joseon < cost) return { ok: false, msg: `재정이 모자랍니다. (필요 ${cost})` };
        S.gold.joseon -= cost;
        c.tr = R((c.tr * c.t + 20 * n) / (c.t + n)); c.t += n;
        c.order = Math.max(5, c.order - (S.reforms.sogo ? 2 : 4)); c.pop = Math.max(0, c.pop - n / 20000);
        msg = `${nm}이(가) ${cn}에서 군사 ${fmt(n)}명을 모았습니다. (재정 ${cost})`; break;
      }
      case 'train': { const v = R(4 + statOf(g, 'lea') / 12); c.tr = Math.min(trainCap('joseon'), c.tr + v); msg = `${nm}이(가) 군사를 훈련해 훈련도가 ${v} 올랐습니다.`; break; }
      case 'uib': {
        const v = R((4 + statOf(g, 'cha') / 12) * boost('uib'));
        const tg = uibTargets(cid);
        for (const k of tg) S.uibPush[k] += v;
        msg = `${nm}이(가) 격문을 돌렸습니다. ${tg.map(k => GD.DO[k]).join('·')}의 의병 활동이 활발해집니다.`; break;
      }
      case 'envoy': {
        const v = (statOf(g, 'pol') + statOf(g, 'cha')) / 150 * boost('envoy');
        S.aid += v; S.flags.envoyThisMonth = true;
        msg = `${nm}이(가) 명에 사신으로 떠났습니다. (원군 요청 ${S.aid.toFixed(1)})`; break;
      }
      case 'joint': { S.flags.joint = arg; msg = `명군에게 ${C[arg].name} 공격을 청했습니다.`; break; }
      case 'ship': {
        const n = Math.min(Math.floor(S.gold.joseon / 45), 1 + Math.floor(statOf(g, 'pol') / 35));
        S.gold.joseon -= n * 45; c.ships.panok = (c.ships.panok || 0) + n; msg = `${cn}에서 판옥선 ${n}척을 만들었습니다.`; break;
      }
      case 'turtle': { c.ships.turtle = (c.ships.turtle || 0) + 1; msg = `${cn}에서 거북선 1척을 만들었습니다.`; break; }
    }
    S.gens[g].acted = true;
    log(msg, 'cmd', cid);
    return { ok: true, msg: josa(msg) };
  }

  // 위임한 고을: 남은 장수가 알아서 내정을 한다
  function autoCity(cid) {
    const c = S.cities[cid], out = [];
    for (const g of gensIn(cid)) {
      if (S.gens[g].acted) continue;
      const enemyNear = landNeighbors(cid).some(n => S.cities[n].o === 'japan');
      let cmd = null;
      if (enemyNear && c.tr < trainCap('joseon') - 5) cmd = 'train';
      else if (enemyNear && c.t < 3000 && S.gold.joseon > 400) cmd = 'recruit';
      else if (c.order < 45 && c.f > 3000) cmd = 'relief';
      else if (c.wall < wallMax(c) * 0.6 && S.gold.joseon > 300) cmd = 'wall';
      else if (S.gold.joseon > 250) cmd = c.farm <= c.trade ? 'farm' : 'trade';
      else if (c.tr < trainCap('joseon')) cmd = 'train';
      if (cmd && !canCmd(cmd, cid, g)) out.push(doCmd(cmd, cid, g).msg);
    }
    return out;
  }

  // ── 출진
  // fac 세력이 from 에서 장수 gens 와 병력 troops 를 이끌고 to 로 간다. opts.mp: 남은 이동력(연속 진격)
  async function march(fac, from, gens, troops, to, opts = {}) {
    const src = S.cities[from], mp = opts.mp ?? mpOf(fac, gens);
    const r = reach(from, fac, mp);
    const kind = r.kind[to];
    if (!kind || kind === 'pass' || kind === 'blocked') return { ok: false, msg: '그곳으로는 갈 수 없습니다.' };
    troops = Math.min(troops, src.t);
    if (troops <= 0 && !gens.length) return { ok: false, msg: '보낼 군사가 없습니다.' };
    const tr = src.tr, mo = src.mo;
    const food = Math.min(src.f, R(troops * 0.5));
    src.t -= troops; src.f -= food;
    for (const g of gens) { S.gens[g].city = null; if (fac === 'joseon') S.gens[g].acted = true; }
    const path = pathTo(r, to);
    if (hooks.animate && !opts.quiet) await hooks.animate(path, fac, kind);
    const left = mp - r.dist[to];
    const dst = S.cities[to];
    if (kind === 'move') {
      dst.tr = R((dst.tr * dst.t + tr * troops) / Math.max(1, dst.t + troops));
      dst.mo = R((dst.mo * dst.t + mo * troops) / Math.max(1, dst.t + troops));
      dst.t += troops; dst.f += food;
      for (const g of gens) S.gens[g].city = to;
      if (fac === 'joseon') log(`${gens.length ? G[gens[0]].name + ' 등이 ' : ''}군사 ${fmt(troops)}명을 이끌고 ${C[to].name}(으)로 옮겼습니다.`, 'move', to);
      return { ok: true, moved: true };
    }
    if (to === S.capital && dst.o === 'joseon' && hooks.capitalThreat) await hooks.capitalThreat(to);
    const spec = landSpec(fac, gens, troops, tr, mo, from, to, r.sea[to]);
    if (opts.types) spec.att.types = opts.types;
    // 함께 싸우는 동맹군: 명군은 이웃한 성에서 조선군의 공격에 스스로 합류한다
    const allies = (opts.allies || []).slice();
    if (fac === 'joseon' && !isTruce()) {
      for (const n of landNeighbors(to)) {
        const nc = S.cities[n];
        if (nc.o !== 'ming' || nc.t < 2500 || C[n].foreign) continue;
        allies.push({ fac: 'ming', from: n, gens: gensIn(n).filter(g => !has(g, 'envoy')).slice(0, 3), troops: R(nc.t * 0.6) });
        break;
      }
    }
    for (const a of allies) {
      const ac = S.cities[a.from];
      a.troops = Math.min(a.troops, ac.t); ac.t -= a.troops; a.tr = ac.tr; a.mo = ac.mo;
      for (const g of a.gens) S.gens[g].city = null;
    }
    spec.att.allies = allies;
    const res = await hooks.battle(spec);
    const out = applyLand(spec, res, food);
    const blitz = fac === 'japan' && nowYm() <= ym(1592, 6);
    out.mpLeft = left - (blitz ? 0 : 1);
    return out;
  }

  function landSpec(fac, gens, troops, tr, mo, from, to, viaSea) {
    const c = S.cities[to];
    return {
      kind: 'land', city: to, y: S.y, m: S.m, title: `${C[to].name} 전투`,
      att: { fac, gens: gens.slice(), troops, tr, mo, from, viaSea: !!viaSea },
      def: { fac: c.o, gens: gensIn(to), troops: c.t, tr: c.tr, mo: c.mo, wall: c.wall, castle: c.castle },
      player: fac === 'joseon' ? 'att' : c.o === 'joseon' ? 'def' : null,
    };
  }

  function retreatTo(from, fac, avoid) {
    const opts = landNeighbors(from).filter(n => S.cities[n].o === fac && n !== avoid && !C[n].foreign);
    if (!opts.length) return null;
    return opts.sort((a, b) => S.cities[b].t - S.cities[a].t)[0];
  }
  // 이웃한 자기 고을 가운데 적 고을에서 가장 먼 곳
  function safest(from, fac) {
    const opts = landNeighbors(from).filter(n => S.cities[n].o === fac && !C[n].foreign);
    if (!opts.length) return null;
    const far = (id) => {
      const seen = new Set([id, from]); let q = [id], d = 0;
      while (q.length && d < 8) {
        const nq = [];
        for (const u of q) for (const v of landNeighbors(u)) {
          if (seen.has(v)) continue;
          if (!ally(S.cities[v].o, fac)) return d + 1;
          seen.add(v); nq.push(v);
        }
        q = nq; d++;
      }
      return 9;
    };
    return opts.sort((a, b) => far(b) - far(a) || S.cities[b].t - S.cities[a].t)[0];
  }
  // 임금이 피란할 곳: 실제 역사처럼 북쪽(평양·의주)을 먼저, 우리 땅으로 이어진 곳만
  function fleeTarget(from) {
    const seen = new Set([from]), q = [from], ok = new Set();
    while (q.length) {
      const u = q.shift();
      for (const v of landNeighbors(u)) {
        if (seen.has(v) || S.cities[v].o !== 'joseon' || C[v].foreign) continue;
        seen.add(v); ok.add(v); q.push(v);
      }
    }
    const pref = ['pyongyang', 'anju', 'uiju', 'hwangju', 'haeju', 'yeonan', 'gaeseong', 'hamheung', 'wonju'];
    return pref.find(id => id !== from && ok.has(id) && !landNeighbors(id).some(n => S.cities[n].o === 'japan')) || safest(from, 'joseon');
  }
  function nearestOwn(fac, from) {
    const seen = new Set([from]), q = [from];
    while (q.length) {
      const u = q.shift();
      for (const v of neighbors(u)) {
        if (seen.has(v)) continue;
        seen.add(v);
        if (S.cities[v].o === fac) return v;
        q.push(v);
      }
    }
    return fac === 'japan' ? 'tsushima' : fac === 'ming' ? 'liaodong' : null;
  }

  function fate(g, f, enemyFac, place) {
    if (f === 'dead') { S.gens[g].st = 'dead'; S.gens[g].city = null; S.gens[g].fleet = null; log(`${G[g].name}이(가) ${place ? C[place]?.name || GD.SEAS[place]?.name : ''}에서 전사했습니다.`, 'death', place); }
    else if (f === 'captive') { Object.assign(S.gens[g], { st: 'captive', captor: enemyFac, city: null, fleet: null, held: place }); log(`${G[g].name}이(가) 사로잡혔습니다.`, 'death', place); }
  }

  function applyLand(spec, res, food = 0) {
    const cid = spec.city, c = S.cities[cid], A = spec.att, D = spec.def;
    for (const u of res.att.gens) fate(u.id, u.fate, D.fac, cid);
    for (const u of res.def.gens) fate(u.id, u.fate, A.fac, cid);
    (A.allies || []).forEach((a, i) => {
      const ar = (res.att.allies || [])[i] || { left: 0, gens: [] };
      for (const u of ar.gens) fate(u.id, u.fate, D.fac, cid);
      const home = S.cities[a.from].o === a.fac ? a.from : nearestOwn(a.fac, cid);
      if (home) { S.cities[home].t += ar.left; for (const u of ar.gens) if (u.fate === 'ok') S.gens[u.id].city = home; }
    });
    const aLost = A.troops - res.att.left, dLost = D.troops - res.def.left;
    tally(spec, res, aLost, dLost);
    if (res.win === 'att') {
      const prev = c.o;
      const back = retreatTo(cid, prev, A.from);
      const survivors = res.def.gens.filter(u => u.fate === 'ok').map(u => u.id);
      if (back) {
        S.cities[back].t += res.def.left;
        for (const g of survivors) S.gens[g].city = back;
      } else {
        for (const g of survivors) {
          const far = nearestOwn(prev, cid);
          if (far && Math.random() < 0.7) S.gens[g].city = far;
          else fate(g, 'captive', A.fac, cid);
        }
      }
      c.o = A.fac; c.t = res.att.left; c.tr = A.tr; c.mo = clamp(A.mo + 8, 0, 100);
      c.f = R((c.burnt ? 0 : c.f * 0.6) + food); c.burnt = false;
      c.wall = R(c.wall * res.wallLeft);
      c.order = A.fac === 'joseon' ? Math.max(c.order, 55) : A.fac === 'japan' ? 25 : 45;
      for (const ty of Object.keys(c.ships)) c.ships[ty] = A.fac === prev ? c.ships[ty] : 0;
      for (const g of A.gens) if (S.gens[g].st === 'on') S.gens[g].city = cid;
      // 이 성에 갇혀 있던 포로를 풀어 준다
      for (const [g, s] of Object.entries(S.gens)) if (s.st === 'captive' && s.held === cid && ally(G[g].fac, A.fac)) Object.assign(s, { st: 'on', city: cid, held: null });
      if (prev === 'joseon') S.stats.lostCities++;
      log(`${GD.FAC[A.fac].name}군이 ${C[cid].name}을(를) 차지했습니다.`, A.fac === 'joseon' ? 'win' : prev === 'joseon' ? 'loss' : 'info', cid);
      onCaptured(cid, prev, A.fac);
    } else {
      const back = S.cities[A.from] && S.cities[A.from].o === A.fac ? A.from : nearestOwn(A.fac, cid);
      if (back) {
        S.cities[back].t += res.att.left; S.cities[back].f += R(food * 0.5);
        for (const u of res.att.gens) if (u.fate === 'ok') S.gens[u.id].city = back;
      }
      c.t = res.def.left; c.mo = clamp(c.mo + 6, 0, 100); c.wall = R(c.wall * res.wallLeft);
      log(`${C[cid].name}에서 ${GD.FAC[D.fac].name}군이 ${GD.FAC[A.fac].name}군을 물리쳤습니다.`, D.fac === 'joseon' ? 'win' : A.fac === 'joseon' ? 'loss' : 'info', cid);
    }
    hooks.change && hooks.change();
    return { ok: true, win: res.win, res };
  }

  function tally(spec, res, aLost, dLost) {
    const pSide = spec.att.fac === 'joseon' ? 'att' : spec.def.fac === 'joseon' ? 'def' : null;
    if (!pSide) return;
    const mine = pSide === 'att' ? aLost : dLost, theirs = pSide === 'att' ? dLost : aLost;
    S.stats.kills += theirs; S.stats.losses += mine;
    if (res.win === pSide) {
      S.stats.won++;
      if (theirs >= 3000 && theirs >= mine * 2.5) S.stats.great.push({ y: S.y, m: S.m, title: spec.title, kills: theirs, loss: mine });
    } else S.stats.lost++;
  }

  // 성이 넘어갔을 때: 왕의 피란 등
  function onCaptured(cid, prev, by) {
    const king = Object.keys(S.gens).find(g => has(g, 'king') && G[g].fac === prev && S.gens[g].st === 'on' && S.gens[g].city === cid);
    if (!king || prev !== 'joseon') return;
    const back = safest(cid, 'joseon');
    if (back && !(S.flags.stayed && Math.random() < 0.5)) {
      S.gens[king].city = back; S.capital = back;
      for (const id of citiesOf('joseon')) S.cities[id].order = Math.max(5, S.cities[id].order - 5);
      S.gold.joseon = R(S.gold.joseon * 0.7);
      log(`도성이 무너져 ${G[king].name}이(가) ${C[back].name}(으)로 급히 피란했습니다. 민심이 크게 흔들립니다.`, 'loss', back);
    } else {
      fate(king, 'captive', by, cid);
      S.flags.kingCaptured = true;
    }
  }

  // ── 수군
  function shipsLabel(s) {
    return Object.entries(s).filter(([, n]) => n > 0).map(([k, n]) => `${GD.UNITS[k].name} ${n}`).join(' · ') || '없음';
  }
  // 포구의 배를 이끌고 바다로 나간다
  async function sail(fac, cid, gens, ships, zone, opts = {}) {
    const c = S.cities[cid], home = C[cid].port;
    const r = seaReach(home, fac, opts.mp || 3);
    if (zone !== home && r.dist[zone] === undefined) return { ok: false, msg: '그 바다로는 갈 수 없습니다.' };
    for (const [k, n] of Object.entries(ships)) { c.ships[k] = (c.ships[k] || 0) - n; if (c.ships[k] <= 0) delete c.ships[k]; }
    const fl = { id: S.fid++, o: fac, zone: home, g: gens.slice(), s: Object.assign({}, ships), tr: c.tr, mo: c.mo, moved: true };
    S.fleets.push(fl);
    for (const g of gens) Object.assign(S.gens[g], { city: null, fleet: fl.id, acted: fac === 'joseon' ? true : S.gens[g].acted });
    return moveFleet(fl, zone, Object.assign({ fresh: true }, opts));
  }
  async function moveFleet(fl, zone, opts = {}) {
    const r = seaReach(fl.zone, fl.o, opts.mp || 3);
    if (zone !== fl.zone && r.dist[zone] === undefined) return { ok: false, msg: '그 바다로는 갈 수 없습니다.' };
    const path = [zone];
    while (r.prev[path[0]] !== undefined) path.unshift(r.prev[path[0]]);
    if (hooks.animate && path.length > 1) await hooks.animate(path, fl.o, 'sea');
    fl.zone = zone; fl.moved = true;
    for (const g of fl.g) if (fl.o === 'joseon') S.gens[g].acted = true;
    const enemySide = fl.o === 'japan' ? 'allied' : 'japan';
    const foes = S.fleets.filter(f => f.zone === zone && !ally(f.o, fl.o));
    if (foes.length) return seaBattle(fl, foes, null);
    if (opts.harbor) {
      const port = opts.harbor, pc = S.cities[port];
      if (pc && !ally(pc.o, fl.o) && totalShips(pc.ships) > 0) return seaBattle(fl, [], port);
    }
    if (shipsIn(zone, enemySide) === 0 && fl.o === 'joseon') log(`함대가 ${GD.SEAS[zone].name}에 진을 쳤습니다.`, 'move');
    hooks.change && hooks.change();
    return { ok: true, moved: true };
  }
  function dock(fl, cid) {
    const c = S.cities[cid];
    if (!c || c.o !== fl.o || C[cid].port !== fl.zone) return { ok: false, msg: '그 포구에 댈 수 없습니다.' };
    for (const [k, n] of Object.entries(fl.s)) c.ships[k] = (c.ships[k] || 0) + n;
    for (const g of fl.g) Object.assign(S.gens[g], { city: cid, fleet: null });
    S.fleets = S.fleets.filter(f => f !== fl);
    hooks.change && hooks.change();
    return { ok: true };
  }

  // 길을 따지지 않는 공격 (사건용)
  async function assault(fac, from, gens, troops, to) {
    const src = S.cities[from];
    troops = Math.min(troops, src.t); src.t -= troops;
    for (const g of gens) S.gens[g].city = null;
    if (hooks.animate) await hooks.animate([from, to], fac, 'attack');
    const spec = landSpec(fac, gens, troops, src.tr, src.mo, from, to, false);
    spec.att.allies = [];
    const res = await hooks.battle(spec);
    return applyLand(spec, res, 0);
  }
  async function seaBattle(att, foes, harbor) {
    const defFac = harbor ? S.cities[harbor].o : foes[0].o;
    const defShips = {}, defGens = [];
    for (const f of foes) { for (const [k, n] of Object.entries(f.s)) defShips[k] = (defShips[k] || 0) + n; defGens.push(...f.g); }
    if (harbor) {
      for (const [k, n] of Object.entries(S.cities[harbor].ships)) defShips[k] = (defShips[k] || 0) + n;
      defGens.push(...gensIn(harbor).filter(g => has(g, 'navy')));
    }
    const zone = att.zone;
    const spec = {
      kind: 'sea', zone, harbor, y: S.y, m: S.m, title: `${harbor ? C[harbor].name + ' 포구' : GD.SEAS[zone].name} 해전`,
      att: { fac: att.o, gens: att.g.slice(), ships: Object.assign({}, att.s), tr: att.tr, mo: att.mo },
      def: { fac: defFac, gens: defGens, ships: defShips, tr: foes[0]?.tr ?? S.cities[harbor].tr, mo: foes[0]?.mo ?? S.cities[harbor].mo, harborFort: harbor ? S.cities[harbor].castle === 'wae' : false },
      player: att.o === 'joseon' ? 'att' : ally(defFac, 'joseon') && defFac === 'joseon' ? 'def' : null,
      ambush: S.flags.ambush || null,
    };
    S.flags.ambush = null;
    const res = await hooks.battle(spec);
    return applySea(spec, res, att, foes, harbor);
  }

  function applySea(spec, res, att, foes, harbor) {
    S.stats.lastSea = { y: S.y, m: S.m, gens: [...spec.att.gens, ...spec.def.gens] };
    for (const u of res.att.gens) fate(u.id, u.fate, spec.def.fac, spec.zone);
    for (const u of res.def.gens) fate(u.id, u.fate, spec.att.fac, spec.zone);
    const lostOf = (a, b) => Object.keys(a).reduce((s, k) => s + (a[k] - (b[k] || 0)) * (GD.UNITS[k].per || 100), 0);
    tally(spec, res, lostOf(spec.att.ships, res.att.ships), lostOf(spec.def.ships, res.def.ships));
    // 공격 함대
    att.s = res.att.ships; att.g = att.g.filter(g => S.gens[g].st === 'on');
    att.mo = clamp(att.mo + (res.win === 'att' ? 8 : -12), 10, 100);
    // 방어 쪽 손실을 함대·포구에 나눈다
    const pools = foes.map(f => f.s);
    if (harbor) pools.push(S.cities[harbor].ships);
    for (const k of Object.keys(spec.def.ships)) {
      const before = spec.def.ships[k], after = res.def.ships[k] || 0;
      if (!before) continue;
      for (const p of pools) if (p[k]) p[k] = Math.floor(p[k] * after / before);
    }
    for (const f of foes) f.g = f.g.filter(g => S.gens[g].st === 'on');
    const loserFleets = res.win === 'att' ? foes : [att];
    for (const f of loserFleets) retreatFleet(f);
    for (const f of [att, ...foes]) {
      if (!S.fleets.includes(f) || totalShips(f.s) > 0) continue;
      const home = portHome(f.o) || citiesOf(f.o)[0] || (f.o === 'japan' ? 'tsushima' : 'liaodong');
      for (const g of f.g) Object.assign(S.gens[g], { fleet: null, city: home });
      S.fleets = S.fleets.filter(x => x !== f);
    }
    const where = spec.harbor ? C[spec.harbor].name : GD.SEAS[spec.zone].name;
    const winFac = res.win === 'att' ? spec.att.fac : spec.def.fac;
    log(`${where}에서 ${GD.FAC[winFac].name} 수군이 이겼습니다.`, winFac === 'joseon' ? 'win' : 'loss');
    hooks.change && hooks.change();
    return { ok: true, win: res.win, res };
  }
  function portHome(fac) {
    const ports = KOREA.filter(id => C[id].port && S.cities[id].o === fac);
    if (fac === 'japan') ports.push('tsushima');
    return ports[0] || null;
  }
  // 진 함대는 가까운 자기 포구로 물러난다
  function retreatFleet(f) {
    if (!S.fleets.includes(f)) return;
    const q = [f.zone], seen = new Set(q);
    while (q.length) {
      const z = q.shift();
      const port = (PORTS[z] || []).find(id => S.cities[id].o === f.o) || (f.o === 'japan' && z === 's_daehan' ? 'tsushima' : null);
      if (port) { f.zone = z; dock(f, port); return; }
      for (const n of GD.SEAS[z].adj) if (!seen.has(n)) { seen.add(n); q.push(n); }
    }
  }

  // ── 청야·몽진·개혁
  function burn(cid) {
    const c = S.cities[cid];
    if (c.o !== 'joseon' || c.burnt) return { ok: false, msg: '' };
    c.f = 0; c.burnt = true; c.order = Math.max(5, c.order - 10);
    log(`${C[cid].name}의 곡식 창고를 불태웠습니다(청야). 적이 군량을 얻지 못합니다.`, 'cmd', cid);
    return { ok: true };
  }
  function moveCapital(to) {
    const king = Object.keys(S.gens).find(g => has(g, 'king') && G[g].fac === 'joseon' && S.gens[g].st === 'on');
    if (!king || S.cities[to].o !== 'joseon') return { ok: false };
    S.gens[king].city = to; S.capital = to; S.flags.stayed = false;
    for (const id of citiesOf('joseon')) S.cities[id].order = Math.max(5, S.cities[id].order - 3);
    log(`조정이 ${C[to].name}(으)로 옮겨 갔습니다.`, 'sys', to);
    return { ok: true };
  }
  const REFORMS = {
    hwapo:    { name: '화포 개량',     cost: 500, from: [1592, 9],  desc: '비격진천뢰·화차 같은 화약 무기를 늘린다. 조선 화포 부대의 공격력과 성벽 파괴력이 오른다.' },
    hullyeon: { name: '훈련도감 설치', cost: 800, from: [1593, 8],  desc: '조총·활·창칼을 다루는 삼수병을 기른다. 조선군도 조총병을 편성할 수 있고 훈련 한도가 오른다.' },
    sanseong: { name: '산성 수축',     cost: 600, from: [1593, 9],  desc: '험한 산성을 고쳐 쌓는다. 산성의 성벽 한도와 축성 효과가 커진다.' },
    sogo:     { name: '속오군 편성',   cost: 500, from: [1594, 1],  desc: '양반부터 노비까지 묶어 지방군을 다시 짠다. 징병으로 모이는 병력이 늘고 민심이 덜 떨어진다.' },
    dunjeon:  { name: '둔전 경영',     cost: 400, from: [1594, 1],  desc: '군사가 농사를 지어 군량을 마련한다. 병력 1천 명 이상인 고을의 농업이 오른다.' },
  };
  function reform(id) {
    const r = REFORMS[id];
    if (S.reforms[id]) return { ok: false, msg: '이미 시행했습니다.' };
    if (nowYm() < ym(...r.from)) return { ok: false, msg: `${r.from[0]}년 ${r.from[1]}월부터 시행할 수 있습니다.` };
    if (S.gold.joseon < r.cost) return { ok: false, msg: '재정이 모자랍니다.' };
    S.gold.joseon -= r.cost; S.reforms[id] = true;
    if (id === 'sanseong') for (const cid of citiesOf('joseon')) if (S.cities[cid].castle === 'san') S.cities[cid].wall += 15;
    if (id === 'dunjeon') for (const cid of citiesOf('joseon')) if (S.cities[cid].t >= 1000) S.cities[cid].farm = Math.min(100, S.cities[cid].farm + 6);
    log(`${r.name}을(를) 시행했습니다.`, 'sys');
    return { ok: true, msg: `${r.name}을(를) 시행했습니다.` };
  }

  // ── 보급망: 육로로 이어진 같은 편 고을 묶음
  function networks(fac) {
    const mine = Object.keys(S.cities).filter(id => S.cities[id].o === fac);
    const seen = new Set(), out = [];
    for (const s of mine) {
      if (seen.has(s)) continue;
      const comp = [], q = [s]; seen.add(s);
      while (q.length) {
        const u = q.shift(); comp.push(u);
        for (const v of landNeighbors(u)) if (!seen.has(v) && S.cities[v].o === fac) { seen.add(v); q.push(v); }
      }
      out.push(comp);
    }
    return out;
  }
  function japanRooted(comp) {
    return comp.some(id => C[id].foreign || (C[id].port && seaOpen(C[id].port)));
  }
  function distribute(ids, lossFn) {
    const need = (id) => S.cities[id].t / 5 * 3 + 400;
    let surplus = 0, deficit = 0; const sur = [], def = [];
    for (const id of ids) {
      const c = S.cities[id], n = need(id);
      if (c.f > n) { sur.push([id, c.f - n]); surplus += c.f - n; } else { def.push([id, n - c.f]); deficit += n - c.f; }
    }
    const T = Math.min(surplus * 0.6, deficit);
    if (T <= 0) return 0;
    let lost = 0;
    for (const [id, s] of sur) S.cities[id].f -= T * s / surplus;
    for (const [id, d] of def) { const a = T * d / deficit, l = lossFn(id); S.cities[id].f += a * (1 - l); lost += a * l; }
    return lost;
  }

  // ── 월말 처리 (한 턴이 여러 달이면 그만큼 곱한다)
  function monthEnd() {
    const step = S.step, rep = [];
    const months = Array.from({ length: step }, (_, i) => ((S.m - 1 + i) % 12) + 1);
    // 재정
    let inc = 100 * step;
    for (const id of citiesOf('joseon')) { const c = S.cities[id]; inc += c.trade * c.order / 100 * 0.8 * step; }
    S.gold.joseon += R(inc); S.gold.japan += 600 * step; S.gold.ming += 400 * step;
    rep.push(`재정 수입 +${fmt(inc)}`);
    // 수확 (5월 보리, 9월 벼)
    const hk = months.reduce((s, m) => s + (m === 9 ? 25 : m === 5 ? 8 : 0), 0);
    if (hk) {
      let mine = 0;
      for (const id of KOREA) {
        const c = S.cities[id], b = C[id];
        const k = c.o === 'joseon' ? c.order / 100 : (1 - S.uib[b.do] / 150) * 0.5;
        const amt = R(c.farm * c.pop * hk * k);
        c.f += amt; if (c.o === 'joseon') mine += amt;
        if (c.o === 'japan') c.order = Math.max(5, c.order - 3);
      }
      rep.push(`${months.includes(9) ? '가을' : '보리'} 수확 +${fmt(mine)}석`);
    }
    // 일본 본국 보급과 서해 뱃길
    const t = nowYm();
    const war = !isTruce() || S.flags.truceBreak;
    const homeFood = (war ? (t >= ym(1597, 1) ? 50000 : 40000) : 20000) * step;
    const homeT = (war && t < ym(1598, 8) ? 2500 : 0) * step;
    const roots = ['busan', 'gimhae', 'ulsan', 'ungcheon', 'geoje'].filter(id => S.cities[id].o === 'japan' && seaOpen(C[id].port));
    const blockade = S.cities.busan.o === 'japan' && !seaOpen('s_busan');
    const dropAt = roots[0] || 'tsushima';
    S.cities[dropAt].f += R(homeFood * (blockade ? 0.3 : 1));
    S.cities[dropAt].t += homeT;
    if (seaOpen('s_seobuk')) {
      const west = KOREA.filter(id => S.cities[id].o === 'japan' && ['s_seobuk', 's_seonam'].includes(C[id].port));
      for (const id of west) S.cities[id].f += R(20000 * step / west.length);
      if (west.length) { S.flags.westSea = true; rep.push('⚠ 일본 수군이 서해 뱃길로 군량을 나르고 있습니다.'); }
    } else S.flags.westSea = false;
    // 고을 사이 군량 나르기
    let jLost = 0;
    for (const comp of networks('japan')) jLost += distribute(comp, (id) => Math.min(0.6, 0.06 + (C[id].foreign ? 0 : S.uib[C[id].do]) / 200));
    for (const comp of networks('joseon')) distribute(comp, () => 0.05);
    for (const comp of networks('ming')) distribute(comp, () => 0.05);
    if (jLost > 3000) rep.push(`의병이 일본군 보급로를 습격해 군량 ${fmt(jLost)}석을 빼앗았습니다.`);
    // 명군 군량 일부를 조선이 댄다
    const mingT = citiesOf('ming').reduce((s, id) => s + S.cities[id].t, 0);
    if (mingT > 0) {
      const due = R(mingT / 5 * 0.5 * step);
      const mine = citiesOf('joseon').sort((a, b) => S.cities[b].f - S.cities[a].f);
      let left = due;
      for (const id of mine) { const take = Math.min(left, S.cities[id].f * 0.3); S.cities[id].f -= take; left -= take; if (left <= 0) break; }
      const given = due - Math.max(0, left);
      for (const id of citiesOf('ming')) S.cities[id].f += R(given * S.cities[id].t / mingT) + R(mingT / 5 * 0.5 * step * S.cities[id].t / mingT);
      rep.push(`명군에게 군량 ${fmt(given)}석을 보냈습니다.${left > 100 ? ' (모자라서 명군의 불만이 커집니다)' : ''}`);
      if (left > 100) for (const id of citiesOf('ming')) S.cities[id].mo = Math.max(10, S.cities[id].mo - 8);
    }
    // 먹고 굶기
    let starve = 0;
    for (const id of Object.keys(S.cities)) {
      const c = S.cities[id];
      if (C[id].foreign && c.o !== 'japan') continue;
      c.f -= R((c.t / 5 + totalShips(c.ships) * 20) * step);
      if (c.f < 0) {
        const lost = Math.min(c.t, R(-c.f * 2)); c.t -= lost; c.f = 0; c.mo = Math.max(5, c.mo - 12);
        if (c.o === 'joseon') starve += lost;
        if (c.o === 'japan' && lost > 500) rep.push(`${C[id].name}의 일본군이 군량이 떨어져 ${fmt(lost)}명이 흩어졌습니다.`);
      }
    }
    if (starve) rep.push(`⚠ 군량이 모자라 조선군 ${fmt(starve)}명이 흩어졌습니다.`);
    // 바다에 나가 있는 함대
    for (const f of S.fleets) {
      const port = (PORTS[f.zone] || []).find(id => S.cities[id].o === f.o);
      const need = totalShips(f.s) * 25 * step;
      if (port && S.cities[port].f >= need) S.cities[port].f -= need;
      else f.mo = Math.max(10, f.mo - 10);
      f.moved = false;
    }
    // 의병 (봉기는 한 달에 한 곳까지)
    let uprisen = false;
    for (const k of Object.keys(GD.DO)) {
      const ids = KOREA.filter(id => C[id].do === k);
      const occ = ids.filter(id => S.cities[id].o === 'japan');
      const uibGens = Object.keys(S.gens).filter(g => S.gens[g].st === 'on' && G[g].fac === 'joseon' && has(g, 'uib') && S.gens[g].city && C[S.gens[g].city].do === k).length;
      const calm = isTruce() && !S.flags.truceBreak;
      if (occ.length && !calm) S.uib[k] = clamp(S.uib[k] * 0.85 + occ.length * 2.2 + uibGens * 4 + S.uibPush[k], 0, 100);
      else S.uib[k] = S.uib[k] * (calm ? 0.6 : 0.5);
      S.uibPush[k] = 0;
      if (calm) continue;
      for (const id of occ) {
        const c = S.cities[id];
        const hit = R(c.t * S.uib[k] / 100 * 0.03 * step);
        c.t -= hit;
        if (!uprisen && S.uib[k] >= 45 && c.castle !== 'wae' && C[id].size < 3 && c.t < S.uib[k] * 20 && Math.random() < 0.2) {
          uprisen = true;
          c.o = 'joseon'; c.t = R(S.uib[k] * 25); c.tr = 35; c.mo = 75; c.order = 60; c.ships = {};
          for (const g of gensIn(id)) { const far = nearestOwn('japan', id); S.gens[g].city = far; }
          rep.push(`🔥 의병이 일어나 ${C[id].name}을(를) 되찾았습니다!`);
          log(`의병이 일어나 ${C[id].name}을(를) 되찾았습니다.`, 'win', id);
        }
      }
    }
    // 민심·훈련·사기
    for (const id of KOREA) {
      const c = S.cities[id];
      if (c.o === 'joseon') {
        const front = landNeighbors(id).some(n => S.cities[n].o === 'japan');
        c.order = clamp(c.order + (c.order < 65 ? 1 : 0) * step - (front ? 2 : 0), 5, 100);
        if (c.tr > 50) c.tr = Math.max(50, c.tr - step);
      }
      c.mo = clamp(c.mo + (c.mo < 60 ? 3 : c.mo > 80 ? -2 : 0) * step, 5, 100);
      c.burnt = c.burnt && c.f === 0;
    }
    return rep;
  }

  // 다음 턴으로: 강화 협상기에는 석 달씩
  function advance() {
    const t = nowYm();
    S.step = S.flags.truce && !S.flags.truceBreak && t >= ym(1593, 8) && t < ym(1596, 12) ? 3 : 1;
    let n = ym(S.y, S.m) + S.step;
    if (S.step === 3 && n > ym(1596, 12)) n = ym(1597, 1);
    S.y = Math.floor(n / 12); S.m = n % 12 + 1; S.turn++;
    S.step = S.flags.truce && !S.flags.truceBreak && nowYm() >= ym(1593, 8) && nowYm() < ym(1596, 12) ? 3 : 1;
    for (const g of Object.values(S.gens)) g.acted = false;
    S.flags.envoyThisMonth = false;
    // 증원군 도착
    for (const w of S.waves) {
      if (w.done || nowYm() < ym(...w.at)) continue;
      w.done = true;
      const c = S.cities[w.to];
      c.t += w.t; c.f += w.f || 0;
      for (const [k, n] of Object.entries(w.s || {})) c.ships[k] = (c.ships[k] || 0) + n;
      for (const g of w.g) if (S.gens[g].st === 'off') Object.assign(S.gens[g], { st: 'on', city: w.to });
      log(`일본에서 증원군 ${fmt(w.t)}명이 ${C[w.to].name}에 이르렀습니다.`, 'loss');
    }
  }

  // 장수를 등장시킨다: 원하는 고을이 자기 땅이 아니면 가까운 자기 고을로
  function spawnGen(g, at, troops = 0) {
    const fac = G[g].fac;
    if (S.gens[g].st === 'dead') return null;
    let cid = at;
    if (!S.cities[cid] || S.cities[cid].o !== fac) cid = nearestOwn(fac, at);
    if (!cid) return null;
    Object.assign(S.gens[g], { st: 'on', city: cid, fleet: null });
    if (troops) S.cities[cid].t += troops;
    return cid;
  }

  // ── 끝 판정과 평가
  function checkEnd() {
    if (S.flags.kingCaptured) return { over: true, win: false, reason: '임금이 사로잡혀 조선이 항복했습니다.' };
    if (!citiesOf('joseon').length) return { over: true, win: false, reason: '조선의 모든 고을을 잃었습니다.' };
    const jpCities = citiesOf('japan').length, jpFleets = S.fleets.filter(f => f.o === 'japan').length;
    if (nowYm() >= ym(1598, 12) || S.flags.warOver) return { over: true, win: jpCities === 0, reason: jpCities === 0 ? '일본군이 모두 물러갔습니다.' : '전쟁이 끝났습니다.' };
    if (nowYm() >= ym(1597, 3) && jpCities === 0 && !jpFleets && !S.waves.some(w => !w.done)) return { over: true, win: true, reason: '일본군을 조선 땅에서 모두 몰아냈습니다.' };
    return { over: false };
  }
  function score() {
    const mine = citiesOf('joseon').length + citiesOf('ming').length, total = KOREA.length;
    const order = citiesOf('joseon').reduce((s, id) => s + S.cities[id].order, 0) / Math.max(1, citiesOf('joseon').length);
    const alive = ['yisunsin', 'kwonyul', 'gwakjaewoo', 'kimsimin', 'ryu'].filter(g => S.gens[g].st === 'on').length;
    let pts = R(mine / total * 400 + order * 2 + S.stats.great.length * 25 + alive * 20 - S.stats.lostCities * 3 + (citiesOf('japan').length ? 0 : 150));
    if (S.flags.kingCaptured) pts = Math.min(pts, 80);
    const grade = pts >= 650 ? ['大捷', '대첩', '조선이 일본군을 크게 무찌르고 나라를 온전히 지켜 냈습니다.']
      : pts >= 520 ? ['勝', '승리', '어려운 전쟁이었지만 나라를 지키고 일본군을 몰아냈습니다.']
      : pts >= 400 ? ['辛勝', '신승', '나라는 지켰으나 피해가 컸습니다. 실제 역사와 비슷한 결과입니다.']
      : pts >= 250 ? ['苦戰', '고전', '많은 땅이 짓밟히고 백성이 큰 고통을 겪었습니다.']
      : ['敗', '패배', '나라를 지키지 못했습니다.'];
    return { pts, grade, mine, total, order: R(order), alive };
  }

  // ── 저장·불러오기
  function save(slot) {
    try { localStorage.setItem(SAVE_KEY + slot, JSON.stringify(S)); return true; } catch (e) { return false; }
  }
  function load(slot) {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY + slot) || 'null');
      if (!s || s.v !== 1) return false;
      S = s; return true;
    } catch (e) { return false; }
  }
  function slotInfo(slot) {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY + slot) || 'null');
      return s ? { y: s.y, m: s.m, scen: s.scen, turn: s.turn, cities: Object.values(s.cities).filter(c => c.o === 'joseon').length } : null;
    } catch (e) { return null; }
  }

  return {
    get S() { return S; }, hooks, ADJ, PORTS, KOREA, CMDS, REFORMS,
    ym, nowYm, ganji, fmt, clamp, ally, has, log, josa,
    newGame, city, gensIn, gensOf, citiesOf, neighbors, landNeighbors, lead, totalShips, shipsLabel,
    wallMax, wallK, forceQ, defPower, trainCap, isTruce, mpOf, reach, pathTo,
    fleetsAt, anchored, shipsIn, seaOpen, seaReach, canCmd, doCmd, autoCity, recruitAmount, uibTargets,
    march, assault, sail, moveFleet, dock, safest, fleeTarget, seaBattleNow: (att, foes) => seaBattle(att, foes, null), retreatFleet, burn, moveCapital, reform, networks, japanRooted,
    monthEnd, advance, spawnGen, nearestOwn, retreatTo, checkEnd, score, save, load, slotInfo,
  };
})();

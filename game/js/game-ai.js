// 칠년전쟁 — 컴퓨터 세력 (일본·명)의 전략 판단
const AI = (() => {
  const C = GD.CITIES, G = GD.GENS;
  const ym = (y, m) => y * 12 + m - 1;
  // 1592년 일본군 군단과 진격 목표 (실제 진격로를 따른다)
  const CORPS92 = {
    c1: { gens: ['konishi', 'so'], size: 18700, goals: ['busan', 'miryang', 'daegu', 'sangju', 'chungju', 'hanyang', 'paju', 'gaeseong', 'hwangju', 'pyongyang', 'anju', 'uiju'] },
    c2: { gens: ['kato', 'nabeshima'], size: 22800, goals: ['busan', 'ulsan', 'gyeongju', 'andong', 'chungju', 'hanyang', 'anbyeon', 'hamheung', 'gilju', 'gyeongseong', 'hoeryong'] },
    c3: { gens: ['kuroda'], size: 11000, goals: ['gimhae', 'miryang', 'seongju', 'cheongju', 'jiksan', 'suwon', 'hanyang', 'gaeseong', 'yeonan', 'haeju'] },
    c4: { gens: ['moriy', 'shimazu'], size: 14000, goals: ['busan', 'daegu', 'andong', 'chungju', 'wonju', 'chuncheon', 'gangneung'] },
    c5: { gens: ['fukushima', 'hachisuka'], size: 25000, goals: ['busan', 'miryang', 'daegu', 'sangju', 'chungju', 'cheongju', 'gongju', 'hongju'] },
    c6: { gens: ['takakage', 'tachibana'], size: 12000, goals: ['busan', 'miryang', 'daegu', 'seongju', 'geumsan', 'jeonju', 'gwangju', 'naju'] },
    c6b: { gens: ['ekei'], size: 4000, goals: ['gimhae', 'ungcheon', 'uiryeong', 'jinju', 'sacheon'] },
    c7: { gens: ['terumoto', 'kikkawa'], size: 30000, goals: ['busan', 'miryang', 'daegu', 'sangju', 'seongju'] },
    c8: { gens: ['ukita', 'ishida'], size: 10000, goals: ['busan', 'daegu', 'sangju', 'chungju', 'hanyang'] },
  };
  // 1597년 정유재란: 좌군은 남원으로, 우군은 황석산성을 넘어 전주로
  const CORPS97 = {
    left: { gens: ['ukita', 'konishi', 'shimazu', 'hachisuka', 'so', 'hideaki'], size: 50000, goals: ['busan', 'gimhae', 'sacheon', 'hamyang', 'namwon', 'jeonju', 'gongju', 'jiksan'] },
    right: { gens: ['morih', 'kato', 'kuroda', 'nabeshima', 'asano', 'kikkawa', 'tachibana'], size: 60000, goals: ['busan', 'ulsan', 'miryang', 'daegu', 'seongju', 'hamyang', 'jeonju', 'gongju', 'jiksan', 'suwon', 'hanyang'] },
  };
  const TRUCE_KEEP = ['busan', 'gimhae', 'ungcheon', 'geoje', 'ulsan'];
  const HOLD_KEEP = ['busan', 'gimhae', 'ungcheon', 'geoje', 'ulsan', 'sacheon', 'suncheon'];
  const SHIP_V = { panok: 1, turtle: 1.6, atake: 0.5, seki: 0.2, mship: 0.85 };

  const S = () => Game.S;
  const t = () => Game.nowYm();
  const isNavy = (g) => G[g].skills.includes('navy');
  const isKing = (g) => G[g].skills.includes('king');

  function jMode() {
    const s = S();
    if (s.flags.hideyoshiDead) return 'withdraw';
    if (s.flags.truce && !s.flags.truceBreak) return 'truce';
    if (t() >= ym(1597, 1) && t() <= ym(1597, 9)) return 'jeongyu';
    if (t() >= ym(1597, 10)) return 'hold';
    return 'invade';
  }
  const thr = (mode) => mode === 'jeongyu' ? 1.15 : mode === 'invade' ? (t() <= ym(1592, 7) ? 1.05 : 1.4) : 2.0;

  function garrisonNeed(id) {
    if (C[id].foreign) return 0;
    const front = Game.landNeighbors(id).some(n => !Game.ally(S().cities[n].o, S().cities[id].o) && !C[n].foreign);
    const base = C[id].size >= 3 ? 2500 : C[id].size === 2 ? 1500 : 900;
    return front ? base * 1.5 : base;
  }
  // 소유를 무시한 가장 짧은 길
  function bfsPath(a, b, fac) {
    const prev = { [a]: null }, q = [a];
    while (q.length) {
      const u = q.shift();
      if (u === b) break;
      for (const e of Game.ADJ[u] || []) {
        if (e.sea && fac !== 'japan') continue;
        if (C[e.to].foreign && S().cities[e.to].o !== fac) continue;
        if (C[e.to].naval) continue;
        if (prev[e.to] !== undefined) continue;
        prev[e.to] = u; q.push(e.to);
      }
    }
    if (prev[b] === undefined) return null;
    const p = [b];
    while (prev[p[0]] !== null) p.unshift(prev[p[0]]);
    return p;
  }
  function pickToward(cur, goal, r, fac) {
    if (r.kind[goal] === 'move' || r.kind[goal] === 'attack') return goal;
    const path = bfsPath(cur, goal, fac);
    if (!path) return null;
    let lastOwn = null;
    for (const id of path.slice(1)) {
      const k = r.kind[id];
      if (S().cities[id].o === fac) { if (k === 'move') lastOwn = id; else break; }
      else if (Game.ally(S().cities[id].o, fac)) { if (k !== 'pass') break; }
      else { if (k === 'attack') return id; break; }
    }
    return lastOwn;
  }
  const cap = (gens) => gens.reduce((s, g) => s + 2000 + G[g].lea * 130, 0) * 1.25;

  // ── 일본
  async function japan() {
    const mode = jMode();
    const moved = new Set();
    await jNavy(mode);
    if (mode === 'withdraw') return jWithdraw();
    if (mode === 'truce') { consolidate('japan', TRUCE_KEEP); return; }
    if (mode === 'hold') { await jHold(moved); flow('japan'); return; }
    const table = mode === 'jeongyu' ? CORPS97 : CORPS92;
    for (const [cid, corps] of Object.entries(table)) {
      const gens = corps.gens.filter(g => S().gens[g].st === 'on' && S().gens[g].city && !moved.has(g));
      if (!gens.length) continue;
      // 군단 장수가 흩어져 있으면 대장이 있는 곳을 기준으로
      const home = S().gens[gens[0]].city;
      const here = gens.filter(g => S().gens[g].city === home);
      await advance(home, here, corps, mode, moved);
    }
    await opportunistic('japan', mode === 'invade' && t() <= ym(1592, 7) ? 1.2 : 1.6, moved);
    flow('japan');
  }
  async function advance(home, gens, corps, mode, moved) {
    let cur = home, mp = Game.mpOf('japan', gens), guard = 0;
    while (mp > 0 && guard++ < 6) {
      const goal = corps.goals.find(id => S().cities[id].o !== 'japan');
      if (!goal) return;
      const r = Game.reach(cur, 'japan', mp);
      const target = pickToward(cur, goal, r, 'japan');
      if (!target || target === cur) return;
      const src = S().cities[cur];
      let force = Math.max(0, src.t - garrisonNeed(cur));
      force = Math.min(force, C[cur].foreign ? Math.min(corps.size, src.t) : cap(gens));
      if (force < 500) return;
      if (r.kind[target] === 'attack') {
        const ratio = Game.forceQ(force, gens, src.tr, src.mo) / Math.max(1, Game.defPower(target));
        if (ratio < thr(mode)) return;
      }
      const res = await Game.march('japan', cur, gens, force, target, { mp });
      gens.forEach(g => moved.add(g));
      if (!res.ok) return;
      if (res.moved) { mp -= r.dist[target]; cur = target; continue; }
      if (res.win === 'att') { cur = target; mp = res.mpLeft; gens = gens.filter(g => S().gens[g].st === 'on'); continue; }
      return;
    }
  }
  // 이웃한 약한 적 고을을 친다
  async function opportunistic(fac, k, moved) {
    const mine = Object.keys(S().cities).filter(id => S().cities[id].o === fac && !C[id].foreign);
    mine.sort((a, b) => S().cities[b].t - S().cities[a].t);
    for (const id of mine) {
      const c = S().cities[id];
      if (c.o !== fac) continue;
      const gens = Game.gensIn(id).filter(g => !moved.has(g) && !isNavy(g));
      const force = c.t - garrisonNeed(id);
      if (force < 1500) continue;
      const r = Game.reach(id, fac, 1);
      let best = null, bs = 0;
      for (const [to, kd] of Object.entries(r.kind)) {
        if (kd !== 'attack' || C[to].foreign) continue;
        const ratio = Game.forceQ(force, gens, c.tr, c.mo) / Math.max(1, Game.defPower(to));
        const s = ratio * (1 + C[to].size * 0.2) + (S().flags.joint === to && fac === 'ming' ? 0.5 : 0);
        if (ratio >= k && s > bs) { bs = s; best = to; }
      }
      if (!best) continue;
      gens.forEach(g => moved.add(g));
      await Game.march(fac, id, gens, force, best, { mp: 1 });
    }
  }
  // 뒤쪽 고을의 남는 병력을 앞쪽으로 보낸다
  function flow(fac) {
    const s = S();
    const own = (id) => s.cities[id].o === fac;
    const front = Object.keys(s.cities).filter(id => own(id) && !C[id].foreign && Game.landNeighbors(id).some(n => !Game.ally(s.cities[n].o, fac) && !C[n].foreign));
    if (!front.length) return;
    const dist = {}, q = [];
    for (const id of front) { dist[id] = 0; q.push(id); }
    while (q.length) {
      const u = q.shift();
      for (const e of Game.ADJ[u] || []) {
        if (dist[e.to] !== undefined || !own(e.to)) continue;
        dist[e.to] = dist[u] + 1; q.push(e.to);
      }
    }
    for (const id of Object.keys(dist)) {
      if (dist[id] === 0) continue;
      const c = s.cities[id];
      const extra = c.t - garrisonNeed(id) * (C[id].foreign ? 0 : 1);
      if (extra < 1000) continue;
      const next = (Game.ADJ[id] || []).map(e => e.to).filter(n => dist[n] === dist[id] - 1)[0];
      if (!next) continue;
      const n = s.cities[next], amt = Math.round(extra * 0.8);
      n.tr = Math.round((n.tr * n.t + c.tr * amt) / (n.t + amt)); n.t += amt; c.t -= amt;
      const fd = Math.min(c.f * 0.5, amt * 0.5); c.f -= fd; n.f += fd;
    }
  }
  // 강화기·철수기: 정해진 왜성으로 모인다
  function consolidate(fac, keep) {
    const s = S();
    for (const id of Object.keys(s.cities)) {
      const c = s.cities[id];
      if (c.o !== fac || C[id].foreign || keep.includes(id)) continue;
      const dest = keep.filter(k => s.cities[k].o === fac).map(k => [k, (bfsPath(id, k, fac) || []).length || 99]).sort((x, y) => x[1] - y[1]).map(x => x[0])[0] || 'tsushima';
      s.cities[dest].t += c.t; s.cities[dest].f += c.f * 0.5;
      for (const g of Game.gensIn(id)) s.gens[g].city = dest;
      abandon(id, fac);
    }
  }
  function abandon(id, fac) {
    const c = S().cities[id];
    c.o = 'joseon'; c.t = 800; c.tr = 35; c.mo = 60; c.order = 45; c.ships = {};
    Game.log(`${GD.FAC[fac].name}군이 ${C[id].name}에서 물러갔습니다. 고을이 다시 조선의 손에 들어왔습니다.`, 'win', id);
  }
  async function jHold(moved) {
    const s = S();
    for (const id of Object.keys(s.cities)) {
      const c = s.cities[id];
      if (c.o !== 'japan' || C[id].foreign || HOLD_KEEP.includes(id)) continue;
      const dest = HOLD_KEEP.filter(k => s.cities[k].o === 'japan').map(k => [k, (bfsPath(id, k, 'japan') || []).length || 99]).sort((a, b) => a[1] - b[1])[0];
      if (!dest) continue;
      s.cities[dest[0]].t += c.t; s.cities[dest[0]].f += c.f * 0.5;
      for (const g of Game.gensIn(id)) s.gens[g].city = dest[0];
      abandon(id, 'japan');
    }
    await opportunistic('japan', 2.2, moved);
  }
  function jWithdraw() {
    const s = S();
    if (t() < ym(1598, 11)) { consolidate('japan', HOLD_KEEP); return; }
    // 11월: 모두 바다를 건너 돌아간다
    for (const id of Object.keys(s.cities)) {
      const c = s.cities[id];
      if (c.o !== 'japan' || C[id].foreign) continue;
      s.cities.tsushima.t += Math.round(c.t * 0.7);
      for (const g of Game.gensIn(id)) s.gens[g].city = 'tsushima';
      abandon(id, 'japan');
    }
    for (const f of s.fleets.filter(f => f.o === 'japan')) { f.zone = 's_daehan'; Game.dock(f, 'tsushima'); }
    s.flags.evacuated = true;
  }

  // ── 일본 수군
  function navalPower(ships, gens, tr = 70, mo = 70) {
    const v = Object.entries(ships || {}).reduce((s, [k, n]) => s + (SHIP_V[k] || 0.5) * n, 0);
    return v * (0.6 + Game.lead(gens) / 200) * (0.5 + tr / 200) * (0.5 + mo / 200);
  }
  function zoneAllied(z) {
    const s = S();
    let p = 0;
    for (const f of s.fleets.filter(f => f.zone === z && f.o !== 'japan')) p += navalPower(f.s, f.g, f.tr, f.mo);
    for (const id of Game.PORTS[z] || []) { const c = s.cities[id]; if (c.o !== 'japan') p += navalPower(c.ships, Game.gensIn(id).filter(isNavy), c.tr, c.mo); }
    return p;
  }
  async function jNavy(mode) {
    const s = S();
    if (mode === 'withdraw' || mode === 'truce') {
      for (const f of s.fleets.filter(f => f.o === 'japan')) Game.retreatFleet(f);
      return;
    }
    if (s.flags.jNavyWary && t() < s.flags.jNavyWary) {
      for (const f of s.fleets.filter(f => f.o === 'japan')) Game.retreatFleet(f);
      return;
    }
    // 가장 큰 일본 함선 무리
    const ports = Object.keys(s.cities).filter(id => s.cities[id].o === 'japan' && C[id].port && Game.totalShips(s.cities[id].ships) >= 8);
    const at = ports.map(id => ({ kind: 'port', id, zone: C[id].port, ships: s.cities[id].ships, gens: Game.gensIn(id).filter(isNavy) }))
      .concat(s.fleets.filter(f => f.o === 'japan').map(f => ({ kind: 'fleet', f, zone: f.zone, ships: f.s, gens: f.g })));
    if (!at.length) return;
    at.sort((a, b) => navalPower(b.ships, b.gens) - navalPower(a.ships, a.gens));
    const main = at[0];
    if (!main.gens.length && main.kind === 'port') {
      // 수군 장수가 다른 곳에 있으면 데려온다
      const g = Game.gensOf('japan').find(x => isNavy(x) && s.gens[x].city && !s.gens[x].fleet);
      if (g) s.gens[g].city = main.id; else return;
      main.gens = [g];
    }
    const myP = navalPower(main.ships, main.gens);
    const r = Game.seaReach(main.zone, 'japan', 3);
    let target = null, harbor = null, best = 0;
    for (const z of [main.zone, ...Object.keys(r.dist)]) {
      const ap = zoneAllied(z);
      if (ap <= 0) continue;
      const ratio = myP / ap;
      const chainK = GD.SEA_CHAIN.indexOf(z) >= 0 ? 1.2 : 1;
      if (ratio >= (mode === 'jeongyu' ? 1.1 : 1.3) && ratio * chainK > best) {
        best = ratio * chainK; target = z;
        const hasFleet = s.fleets.some(f => f.zone === z && f.o !== 'japan');
        harbor = hasFleet ? null : (Game.PORTS[z] || []).find(id => s.cities[id].o !== 'japan' && Game.totalShips(s.cities[id].ships) > 0) || null;
      }
    }
    if (!target) {
      if (main.kind === 'fleet') Game.retreatFleet(main.f);
      return;
    }
    const before = Game.totalShips(main.ships);
    let res;
    if (main.kind === 'port') {
      const ships = Object.assign({}, s.cities[main.id].ships);
      res = await Game.sail('japan', main.id, main.gens, ships, target, { harbor });
    } else res = await Game.moveFleet(main.f, target, { harbor });
    // 크게 지면 석 달 동안 포구에 숨는다 (한산도 대첩 뒤처럼)
    if (res && res.res && res.win === 'def') {
      const after = Game.totalShips(res.res.att.ships || {});
      if (after < before * 0.6) s.flags.jNavyWary = t() + 3;
    }
  }

  // ── 명
  async function ming() {
    const s = S();
    if (!Object.values(s.cities).some(c => c.o === 'ming' && c.t > 0)) return;
    if (s.flags.truce && !s.flags.truceBreak) return;
    const moved = new Set();
    const wary = s.flags.mingDefeat && t() - s.flags.mingDefeat < 3;
    const k = wary ? 2.3 : 1.45;
    const cities = Object.keys(s.cities).filter(id => s.cities[id].o === 'ming' && s.cities[id].t >= 2000);
    for (const id of cities) {
      const c = s.cities[id];
      const gens = Game.gensIn(id).filter(g => !moved.has(g) && !isNavy(g) && !G[g].skills.includes('envoy'));
      const force = c.t;
      if (force < 2000) continue;
      const r = Game.reach(id, 'ming', Game.mpOf('ming', gens) + 1);
      let best = null, bs = 0;
      for (const [to, kd] of Object.entries(r.kind)) {
        if (kd !== 'attack') continue;
        const ratio = Game.forceQ(force, gens, c.tr, c.mo) / Math.max(1, Game.defPower(to));
        const want = s.flags.joint === to ? 0.8 : 1;
        const sc = ratio / want * (1 + C[to].size * 0.25) - r.dist[to] * 0.35;
        if (ratio >= k * want && sc > bs) { bs = sc; best = to; }
      }
      if (!best) continue;
      gens.forEach(g => moved.add(g));
      let allies = [];
      if (Game.hooks.invite) {
        const join = await Game.hooks.invite('ming', id, best, force, gens);
        if (join) allies = [join];
      }
      const res = await Game.march('ming', id, gens, force, best, { mp: Game.mpOf('ming', gens) + 1, allies });
      if (res && res.ok && res.win === 'def') s.flags.mingDefeat = t();
      if (res && res.ok && res.win === 'att' && s.flags.joint === best) s.flags.joint = null;
      // 명군이 떠난 성은 조선 관군에게 넘긴다
      if (!C[id].foreign && s.cities[id].o === 'ming' && !Game.gensIn(id).length) {
        Object.assign(s.cities[id], { o: 'joseon', t: s.cities[id].t + 1500, tr: 40, mo: 60 });
        Game.log(`명군이 떠난 ${C[id].name}을(를) 조선 관군이 맡았습니다.`, 'info', id);
      }
    }
    // 명 수군은 조선의 가장 큰 함대를 따라간다
    for (const f of s.fleets.filter(f => f.o === 'ming')) {
      const jf = s.fleets.filter(x => x.o === 'joseon').sort((a, b) => Game.totalShips(b.s) - Game.totalShips(a.s))[0];
      if (jf && jf.zone !== f.zone) { const rr = Game.seaReach(f.zone, 'ming', 3); if (rr.dist[jf.zone] !== undefined) await Game.moveFleet(f, jf.zone, {}); }
    }
  }

  return { run: async (fac) => fac === 'japan' ? japan() : ming(), jMode, navalPower, TRUCE_KEEP, HOLD_KEEP, CORPS92, CORPS97, abandon };
})();

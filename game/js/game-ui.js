// 칠년전쟁 — 화면 (시작 화면·패널·명령 창·사건 창·턴 진행·전투 연결·저장)
const UI = (() => {
  const C = GD.CITIES, G = GD.GENS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const S = () => Game.S;
  const fmt = (n) => Game.fmt(n);
  const R = Math.round;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PREF_KEY = 'imjin_game_prefs';
  const prefs = Object.assign({ speed: 1, bspeed: 1, ask: 'gen' }, (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (e) { return {}; } })());
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* 저장 못 해도 진행 */ } };
  let sel = null, selFleet = null, selZone = null, mode = null, busy = false, rtab = 'fac', ctab = 'naejeong';
  const EVMAP = typeof EVENTS !== 'undefined' ? Object.fromEntries(EVENTS.map(e => [e.id, e])) : {};

  // ── 작은 도구
  function portrait(g, size = 'm') {
    const d = G[g];
    return `<span class="pt pt-${size}" style="--fc:${GD.FAC[d.fac].color}" title="${esc(d.name)}">${d.ch}</span>`;
  }
  function bio(g) {
    const pid = GD.PEOPLE_ID[g] || g;
    const p = typeof PEOPLE !== 'undefined' ? PEOPLE.find(x => x.id === pid) : null;
    return p ? { role: p.role, life: p.life, text: p.text } : { role: '', life: '', text: G[g].bio || '' };
  }
  const statLine = (g) => { const d = G[g]; return `통${d.lea} 무${d.war} 지${d.int} 정${d.pol} 매${d.cha}`; };
  const skillTags = (g) => G[g].skills.filter(s => s !== 'king').map(s => `<i class="sk">${GD.SKILLS[s]}</i>`).join('');
  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.innerHTML = Game.josa(msg); t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms);
  }
  function banner(text) {
    const b = $('#banner');
    if (!text) { b.classList.remove('on'); return; }
    b.textContent = text; b.classList.add('on');
  }
  function histLinks(ids) {
    return (ids || []).map(id => EVMAP[id]).filter(Boolean).map(e => `<a href="../#${e.id}${e.battle ? '/battle' : ''}" target="_blank" rel="noopener">${esc(e.title)} <small>${e.date}</small> ↗</a>`).join('');
  }
  function histNote(spec) {
    const ids = spec.kind === 'land' ? (C[spec.city].hist || []) : (GD.SEAS[spec.zone].hist || []).concat(spec.harbor ? C[spec.harbor].hist || [] : []);
    const evs = ids.map(id => EVMAP[id]).filter(e => e && e.date);
    if (!evs.length) return '';
    const t = Game.ym(spec.y, spec.m);
    const at = (d) => { const m = d.match(/(\d{4})\.(\d{2})/); return m ? Game.ym(+m[1], +m[2]) : 0; };
    evs.sort((a, b) => Math.abs(at(a.date) - t) - Math.abs(at(b.date) - t));
    const e = evs[0];
    const desc = String(e.desc || '').replace(/<[^>]+>/g, '');
    return `<b>실제 역사</b> · ${esc(e.title)} (${e.date})<br>${esc(desc.slice(0, 120))}${desc.length > 120 ? '…' : ''} <a href="../#${e.id}${e.battle ? '/battle' : ''}" target="_blank" rel="noopener">${e.battle ? '전투 재생 보기' : '자세히'} ↗</a>`;
  }

  // ── 창
  function dialog({ title, html, buttons = [{ label: '확인', value: true, primary: true }], wide, onMount, cls, noClose }) {
    return new Promise(res => {
      const root = $('#dlg');
      title = Game.josa(title); html = Game.josa(html);
      root.innerHTML = `<div class="dlg-box ${wide ? 'wide' : ''} ${cls || ''}" role="dialog" aria-modal="true"><div class="dlg-head"><h3>${title}</h3>${noClose ? '' : '<button class="x" aria-label="닫기">✕</button>'}</div><div class="dlg-body">${html}</div><div class="dlg-foot">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div></div>`;
      root.classList.remove('hidden');
      const close = (v) => { root.classList.add('hidden'); root.innerHTML = ''; document.removeEventListener('keydown', onKey); res(v); };
      const onKey = (e) => { if (e.key === 'Escape' && !noClose) close(null); };
      document.addEventListener('keydown', onKey);
      if (!noClose) $('.x', root).addEventListener('click', () => close(null));
      $$('.dlg-foot button', root).forEach(b => b.addEventListener('click', () => { const bt = buttons[+b.dataset.i]; close(bt.get ? bt.get(root) : bt.value); }));
      if (onMount) onMount(root, close);
    });
  }
  function event(o) {
    return new Promise(res => {
      const root = $('#evt');
      o = Object.assign({}, o, { title: Game.josa(o.title), body: Game.josa(o.body) });
      const sp = o.gen ? `<div class="ev-pt">${portrait(o.gen, 'l')}<b>${esc(G[o.gen].name)}</b></div>` : '';
      const ch = o.choices ? o.choices.map((c, i) => `<button class="ev-choice" data-i="${i}"><b>${c.label}</b>${c.note ? `<small>${c.note}</small>` : ''}</button>`).join('') : '<button class="btn primary ev-ok">확인</button>';
      root.innerHTML = `<div class="ev-box"><div class="ev-head"><span class="ev-seal">${o.seal || '史'}</span><div><small>${o.date || ''}</small><h2>${o.title}</h2></div></div>
        <div class="ev-main">${sp}<div class="ev-text">${o.body}</div></div>
        ${o.hist && histLinks(o.hist) ? `<div class="ev-hist"><span>실제 역사 보기</span>${histLinks(o.hist)}</div>` : ''}
        <div class="ev-foot ${o.choices ? 'choices' : ''}">${ch}</div></div>`;
      root.classList.remove('hidden');
      const done = (v) => { root.classList.add('hidden'); root.innerHTML = ''; res(v); };
      if (o.choices) $$('.ev-choice', root).forEach(b => b.addEventListener('click', () => done(o.choices[+b.dataset.i].v)));
      else $('.ev-ok', root).addEventListener('click', () => done(true));
    });
  }

  // ── 시작 화면
  function title() {
    $('#app').classList.add('hidden');
    $('#title').classList.remove('hidden');
    const auto = Game.slotInfo('auto');
    $('#title').innerHTML = `<div class="ti-box">
      <div class="ti-logo"><span class="ti-seal">壬辰</span><div><h1>칠년전쟁</h1><p>임진왜란·정유재란 턴제 전략 게임</p></div></div>
      <div class="ti-scen">${Object.entries(GD.SCEN).map(([id, sc], i) => `<label class="ti-card"><input type="radio" name="scen" value="${id}" ${i === 0 ? 'checked' : ''}><b>${sc.title}</b><span>${sc.sub}</span></label>`).join('')}</div>
      <div class="ti-row"><span>난이도</span>
        <label><input type="radio" name="diff" value="easy"> 쉬움</label><label><input type="radio" name="diff" value="normal" checked> 보통</label><label><input type="radio" name="diff" value="hard"> 어려움</label></div>
      <div class="ti-btns"><button class="btn primary big" id="tiNew">새 게임</button>
        ${auto ? `<button class="btn big" id="tiCont">이어 하기 <small>${auto.y}년 ${auto.m}월</small></button>` : ''}
        <button class="btn big" id="tiLoad">불러오기</button><button class="btn big" id="tiHelp">게임 방법</button></div>
      <p class="ti-note">한 턴은 한 달입니다. 장수 능력치와 병력은 게임을 위한 가상의 값이며, 큰 사건은 실제 시기에 일어나지만 결과는 플레이에 따라 달라집니다.
        <a href="../" target="_blank" rel="noopener">임진왜란 전쟁사 지도(원래 프로그램) ↗</a></p></div>`;
    $('#tiNew').addEventListener('click', () => start($('input[name=scen]:checked').value, $('input[name=diff]:checked').value));
    if (auto) $('#tiCont').addEventListener('click', () => { if (Game.load('auto')) resume(); });
    $('#tiLoad').addEventListener('click', () => loadDialog());
    $('#tiHelp').addEventListener('click', () => help());
  }
  let mapReady = false;
  function enterApp() {
    $('#title').classList.add('hidden');
    $('#app').classList.remove('hidden');
    if (!mapReady) {
      GMap.init($('#map'), {
        city: onCity, zone: onZone, fleet: onFleet, none: () => { if (!mode) { sel = null; selFleet = null; selZone = null; GMap.select(null); refresh(); } },
        hover: showTip, leave: hideTip, target: onTarget, selFleet: () => selFleet,
      });
      mapReady = true;
    }
    GMap.speed = prefs.speed;
  }
  async function start(scen, diff) {
    Game.newGame(scen, diff);
    enterApp();
    sel = S().capital; selFleet = null; selZone = null;
    GMap.select(sel); GMap.fit();
    refresh();
    busy = true;
    await GEV.check('opening');
    banner('일본군이 움직입니다…');
    GMap.focusSouth();
    await AI.run('japan');
    banner('');
    await GEV.check('ai');
    S().phase = 'player';
    busy = false;
    refresh();
    autosave();
    if (endIfOver()) return;
    toast('조선의 차례입니다. 고을을 눌러 명령하세요.');
  }
  function resume() {
    enterApp();
    sel = S().capital; GMap.select(sel); GMap.fit();
    S().phase = 'player'; busy = false;
    refresh();
    toast(`${S().y}년 ${S().m}월부터 이어 합니다.`);
  }

  // ── 위쪽 막대
  function renderTop() {
    const s = S();
    const mine = Game.citiesOf('joseon');
    const troops = mine.reduce((t, id) => t + s.cities[id].t, 0);
    const ships = mine.reduce((t, id) => t + Game.totalShips(s.cities[id].ships), 0) + s.fleets.filter(f => f.o === 'joseon').reduce((t, f) => t + Game.totalShips(f.s), 0);
    const idle = Game.gensOf('joseon').filter(g => !s.gens[g].acted && !G[g].skills.includes('king') && s.gens[g].city).length;
    $('#tDate').innerHTML = `${s.y}년 ${s.m}월${s.step > 1 ? `~${((s.m + s.step - 2) % 12) + 1}월` : ''} <small>${Game.ganji(s.y)}년 · ${s.turn}턴</small>`;
    $('#tRes').innerHTML = `<span title="재정"><i>財</i>${fmt(s.gold.joseon)}</span><span title="조선군 병력"><i>兵</i>${fmt(troops)}</span><span title="조선 수군 함선"><i>船</i>${ships}</span>
      <span title="고을: 조선 / 일본 / 명"><i>城</i><b class="cj">${mine.length}</b>/<b class="cw">${Game.citiesOf('japan').length}</b>${Game.citiesOf('ming').length ? `/<b class="cm">${Game.citiesOf('ming').length}</b>` : ''}</span>
      <span title="명령을 기다리는 장수"><i>將</i>${idle}</span>`;
    $('#tEnd').disabled = busy;
    $('#tPhase').textContent = busy ? '진행 중…' : s.flags.truce && !s.flags.truceBreak ? '강화 협상기' : '명령';
  }

  // ── 왼쪽: 고을·함대·바다
  function renderLeft() {
    const box = $('#left');
    if (selFleet) return renderFleet(box);
    if (selZone) return renderZone(box);
    if (!sel) { box.innerHTML = `<div class="lp-empty"><p>지도에서 고을을 누르세요.</p><p class="muted">마우스 휠로 확대·축소, 끌어서 이동합니다.</p>${quickList()}</div>`; bindQuick(box); return; }
    const s = S(), c = s.cities[sel], b = C[sel];
    const mine = c.o === 'joseon';
    const visible = mine || c.o === 'ming' || Game.neighbors(sel).some(n => ['joseon', 'ming'].includes(s.cities[n].o));
    const gens = Game.gensIn(sel, true);
    const need = R(c.t / 4 + Game.totalShips(c.ships) * 20);
    const wm = Game.wallMax(c);
    const head = `<div class="lp-head" style="--fc:${GD.FAC[c.o].color}"><span class="lp-flag">${GD.FAC[c.o].seal}</span><div><h2>${b.name}${sel === s.capital ? ' <i class="crown">♛</i>' : ''}</h2><small>${b.sub ? b.sub + ' · ' : ''}${b.do ? GD.DO[b.do] : '나라 밖'} · ${GD.FAC[c.o].name}</small></div></div>`;
    if (b.foreign) { box.innerHTML = head + `<p class="muted pad">${b.name}은(는) ${GD.FAC[b.foreign].name}의 본거지로 공격할 수 없습니다.${b.foreign === 'japan' ? ' 일본군의 증원군이 이곳을 거쳐 바다를 건너옵니다.' : ' 명의 원군이 이곳에서 압록강을 건너옵니다.'}</p>`; return; }
    const stats = visible ? `
      <div class="lp-stats">
        <div><span>병력</span><b>${fmt(c.t)}</b></div><div><span>훈련</span><b>${R(c.tr)}</b></div><div><span>사기</span><b>${R(c.mo)}</b></div>
        <div class="w2"><span>군량</span><b>${fmt(c.f)}석</b><small>달마다 -${fmt(need)}</small></div>
        <div class="w3"><span>성벽</span><span class="bar"><i style="width:${Math.min(100, 100 * c.wall / wm)}%"></i></span><b>${R(c.wall)}/${wm}</b><small>${({ eup: '읍성', san: '산성', wae: '왜성' })[c.castle]}</small></div>
        ${mine ? `<div><span>농업</span><b>${R(c.farm)}</b></div><div><span>상업</span><b>${R(c.trade)}</b></div><div><span>민심</span><b>${R(c.order)}</b></div><div><span>인구</span><b>${c.pop.toFixed(1)}만</b></div>` : `<div class="w3"><span>의병 활동</span><span class="bar uib"><i style="width:${S().uib[b.do]}%"></i></span><b>${R(S().uib[b.do])}</b></div>`}
        ${Game.totalShips(c.ships) ? `<div class="w3"><span>함선</span><b>${Game.shipsLabel(c.ships)}</b></div>` : ''}
      </div>` : `<p class="muted pad">정탐되지 않은 고을입니다. 병력 약 ${fmt(Math.round(c.t / 5000) * 5000 || 1000)}.</p>`;
    let cmds = '';
    if (mine && !busy) {
      const tabs = [['naejeong', '내정'], ['gunsa', '군사'], ['sugun', '수군'], ['insa', '인사'], ['oegyo', '외교'], ['gukjeong', '국정']];
      const list = Object.entries(Game.CMDS).filter(([, d]) => d.cat === ctab);
      let btns = list.map(([id, d]) => `<button class="cmd" data-cmd="${id}" title="${esc(d.desc)}">${d.name}${d.cost ? `<small>${d.cost}</small>` : ''}</button>`).join('');
      if (ctab === 'gunsa') btns = `<button class="cmd main" data-act="march" title="장수와 군사를 이끌고 다른 고을로 옮기거나 적의 성을 칩니다.">출진</button>` + btns + `<button class="cmd" data-act="burn" title="곡식 창고를 불태워 적이 군량을 얻지 못하게 합니다(청야). 민심이 떨어집니다.">청야</button>`;
      if (ctab === 'sugun') btns = (b.port ? `<button class="cmd main" data-act="sail" title="포구의 배를 이끌고 바다로 나갑니다.">함대 출진</button>` : '') + btns;
      if (ctab === 'gukjeong') btns = sel === s.capital ? `<button class="cmd" data-act="reform" title="나라의 제도를 고칩니다.">개혁</button><button class="cmd" data-act="capital" title="조정(임금)을 다른 고을로 옮깁니다.">조정 옮기기</button>` : '<p class="muted">조정이 있는 고을에서만 할 수 있습니다.</p>';
      cmds = `<div class="lp-tabs">${tabs.map(([k, n]) => `<button data-t="${k}" class="${ctab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="lp-cmds">${btns}</div>
        <label class="lp-dele"><input type="checkbox" id="dele" ${c.dele ? 'checked' : ''}> 내정 위임 <small>(남은 장수가 턴 끝에 알아서 내정)</small></label>`;
    }
    const glist = gens.length ? gens.map(g => {
      const st = S().gens[g];
      const show = mine || visible;
      if (!show) return '';
      return `<div class="gl ${st.acted ? 'acted' : ''}" data-g="${g}">${portrait(g, 's')}<div><b>${G[g].name}</b>${skillTags(g)}<small>${statLine(g)}</small></div><span class="gs">${G[g].skills.includes('king') ? '군주' : st.acted ? '완료' : mine ? '대기' : ''}</span></div>`;
    }).join('') : '<p class="muted pad">장수가 없습니다.</p>';
    box.innerHTML = head + stats + cmds + `<h4 class="lp-sub">장수 ${gens.length}</h4><div class="lp-gens">${glist}</div>`;
    $$('.lp-tabs button', box).forEach(bt => bt.addEventListener('click', () => { ctab = bt.dataset.t; renderLeft(); }));
    $$('.cmd[data-cmd]', box).forEach(bt => bt.addEventListener('click', () => pickGen(bt.dataset.cmd)));
    $$('.cmd[data-act]', box).forEach(bt => bt.addEventListener('click', () => ({ march: marchDialog, sail: sailDialog, burn: burnCity, reform: reformDialog, capital: capitalMode })[bt.dataset.act]()));
    $$('.gl', box).forEach(el => el.addEventListener('click', () => genCard(el.dataset.g)));
    const dl = $('#dele', box); if (dl) dl.addEventListener('change', () => { c.dele = dl.checked; });
  }
  function quickList() {
    const s = S();
    const front = Game.citiesOf('joseon').filter(id => Game.landNeighbors(id).some(n => s.cities[n].o === 'japan'));
    return `<h4 class="lp-sub">적과 맞닿은 고을</h4><div class="lp-quick">${front.map(id => `<button data-c="${id}">${C[id].name} <small>${fmt(s.cities[id].t)}</small></button>`).join('') || '<span class="muted">없음</span>'}</div>`;
  }
  function bindQuick(box) { $$('.lp-quick button', box).forEach(b => b.addEventListener('click', () => { onCity(b.dataset.c); GMap.focus(b.dataset.c, 2.4); })); }
  function renderFleet(box) {
    const f = S().fleets.find(x => x.id === selFleet);
    if (!f) { selFleet = null; return renderLeft(); }
    const mine = f.o === 'joseon';
    const z = GD.SEAS[f.zone];
    const ports = (Game.PORTS[f.zone] || []).filter(id => S().cities[id].o === f.o);
    const foes = (Game.PORTS[f.zone] || []).filter(id => !Game.ally(S().cities[id].o, f.o) && Game.totalShips(S().cities[id].ships));
    box.innerHTML = `<div class="lp-head" style="--fc:${GD.FAC[f.o].color}"><span class="lp-flag">船</span><div><h2>${GD.FAC[f.o].name} 함대</h2><small>${z.name}</small></div></div>
      <div class="lp-stats"><div class="w3"><span>함선</span><b>${Game.shipsLabel(f.s)}</b></div><div><span>훈련</span><b>${R(f.tr)}</b></div><div><span>사기</span><b>${R(f.mo)}</b></div><div><span>상태</span><b>${f.moved ? '이동함' : '대기'}</b></div></div>
      ${mine && !busy ? `<div class="lp-cmds"><button class="cmd main" id="fMove" ${f.moved ? 'disabled' : ''}>이동·공격</button>
        ${foes.map(id => `<button class="cmd" data-h="${id}" ${f.moved ? 'disabled' : ''}>${C[id].name} 포구 공격</button>`).join('')}
        ${ports.map(id => `<button class="cmd" data-dock="${id}">${C[id].name}에 귀항</button>`).join('')}</div>` : ''}
      <h4 class="lp-sub">장수</h4><div class="lp-gens">${f.g.map(g => `<div class="gl" data-g="${g}">${portrait(g, 's')}<div><b>${G[g].name}</b>${skillTags(g)}<small>${statLine(g)}</small></div></div>`).join('') || '<p class="muted pad">장수 없음</p>'}</div>
      <p class="muted pad">함대가 바다에 있으면 같은 바다의 자기 포구에서 군량을 받습니다. 포구가 없으면 사기가 떨어집니다.</p>`;
    const mv = $('#fMove', box);
    if (mv) mv.addEventListener('click', () => { mode = { kind: 'fleet', f }; GMap.showSeaReach(Game.seaReach(f.zone, 'joseon', 3), f.zone); modeHint('함대가 갈 바다를 누르세요. (Esc 취소)'); });
    $$('[data-h]', box).forEach(b => b.addEventListener('click', () => doFleet(f, f.zone, b.dataset.h)));
    $$('[data-dock]', box).forEach(b => b.addEventListener('click', () => { Game.dock(f, b.dataset.dock); selFleet = null; sel = b.dataset.dock; GMap.select(sel); refresh(); }));
    $$('.gl', box).forEach(el => el.addEventListener('click', () => genCard(el.dataset.g)));
  }
  function renderZone(box) {
    const z = GD.SEAS[selZone], s = S();
    const fl = s.fleets.filter(f => f.zone === selZone);
    const ports = Game.PORTS[selZone] || [];
    const open = Game.seaOpen(selZone);
    box.innerHTML = `<div class="lp-head sea"><span class="lp-flag">海</span><div><h2>${z.name}</h2><small>바다 구역</small></div></div>
      <div class="pad"><p>${GD.SEA_CHAIN.includes(selZone) ? (open ? '<b class="cw">일본 보급 뱃길이 지나고 있습니다.</b>' : '<b class="cj">조선 수군이 일본 보급 뱃길을 막고 있습니다.</b>') : ''}</p>
      <h4 class="lp-sub">함대</h4>${fl.map(f => `<button class="zl" data-f="${f.id}" style="--fc:${GD.FAC[f.o].color}">${GD.FAC[f.o].name} · ${Game.shipsLabel(f.s)}</button>`).join('') || '<p class="muted">없음</p>'}
      <h4 class="lp-sub">포구</h4>${ports.map(id => `<button class="zl" data-c="${id}" style="--fc:${GD.FAC[s.cities[id].o].color}">${C[id].name} · ${Game.shipsLabel(s.cities[id].ships)}</button>`).join('')}
      <p class="muted">배 3척 이상의 조선·명 수군이 머무는 바다는 일본군이 배로 군량을 나를 수 없습니다.</p></div>`;
    $$('[data-f]', box).forEach(b => b.addEventListener('click', () => onFleet(+b.dataset.f)));
    $$('[data-c]', box).forEach(b => b.addEventListener('click', () => onCity(b.dataset.c)));
  }

  // ── 오른쪽: 세력·장수·기록
  function renderRight() {
    const box = $('#right'), s = S();
    const tabs = [['fac', '세력'], ['gens', '장수'], ['log', '기록']];
    let html = `<div class="rp-tabs">${tabs.map(([k, n]) => `<button data-t="${k}" class="${rtab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="rp-body">`;
    if (rtab === 'fac') {
      const sum = (fac, k) => Game.citiesOf(fac).reduce((t, id) => t + s.cities[id][k], 0);
      const shipsOf = (fac) => Game.citiesOf(fac).reduce((t, id) => t + Game.totalShips(s.cities[id].ships), 0) + s.fleets.filter(f => f.o === fac).reduce((t, f) => t + Game.totalShips(f.s), 0) + (fac === 'japan' ? Game.totalShips(s.cities.tsushima.ships) : 0);
      const jt = sum('japan', 't') + s.cities.tsushima.t;
      const mingT = sum('ming', 't') + s.cities.liaodong.t;
      html += `<div class="fc" style="--fc:${GD.FAC.joseon.color}"><h4>조선</h4><dl>
        <dt>고을</dt><dd>${Game.citiesOf('joseon').length} / ${Game.KOREA.length}</dd><dt>병력</dt><dd>${fmt(sum('joseon', 't'))}</dd>
        <dt>군량</dt><dd>${fmt(sum('joseon', 'f'))}석</dd><dt>재정</dt><dd>${fmt(s.gold.joseon)}</dd><dt>수군</dt><dd>${shipsOf('joseon')}척</dd>
        <dt>조정</dt><dd>${C[s.capital].name}</dd><dt>명 원군 요청</dt><dd>${s.aid.toFixed(1)}</dd>
        <dt>개혁</dt><dd>${Object.keys(s.reforms).map(k => Game.REFORMS[k].name).join(', ') || '없음'}</dd></dl></div>
        <div class="fc" style="--fc:${GD.FAC.japan.color}"><h4>일본 <small>(추정)</small></h4><dl>
        <dt>고을</dt><dd>${Game.citiesOf('japan').length}</dd><dt>병력</dt><dd>약 ${fmt(Math.round(jt / 10000) * 10000)}</dd><dt>수군</dt><dd>약 ${Math.round(shipsOf('japan') / 10) * 10}척</dd>
        <dt>서해 뱃길</dt><dd>${Game.seaOpen('s_seobuk') ? '<b class="cw">열림</b>' : '<b class="cj">막힘</b>'}</dd><dt>부산 앞바다</dt><dd>${Game.seaOpen('s_busan') ? '열림' : '<b class="cj">봉쇄</b>'}</dd></dl></div>
        ${mingT || s.flags.mingIn ? `<div class="fc" style="--fc:${GD.FAC.ming.color}"><h4>명</h4><dl><dt>고을</dt><dd>${Game.citiesOf('ming').length}</dd><dt>병력</dt><dd>${fmt(mingT)}</dd></dl></div>` : ''}
        <h4 class="rp-sub">도별 의병 활동</h4><div class="uibs">${Object.entries(GD.DO).map(([k, n]) => `<div><span>${n}</span><span class="bar uib"><i style="width:${s.uib[k]}%"></i></span><b>${R(s.uib[k])}</b></div>`).join('')}</div>
        <p class="muted">의병 활동이 높으면 점령지의 일본군이 줄고, 보급 군량을 빼앗기며, 의병이 고을을 되찾기도 합니다.</p>`;
    } else if (rtab === 'gens') {
      const order = { on: 0, out: 1, captive: 2, dead: 3 };
      const list = Object.keys(G).filter(g => G[g].fac === 'joseon' && s.gens[g].st !== 'off').sort((a, b) => order[s.gens[a].st] - order[s.gens[b].st] || G[b].lea - G[a].lea);
      html += list.map(g => {
        const st = s.gens[g];
        const loc = st.st === 'dead' ? '전사·사망' : st.st === 'captive' ? '포로' : st.st === 'out' ? '백의종군' : st.fleet ? '함대' : C[st.city]?.name || '';
        return `<div class="gl ${st.st !== 'on' ? 'off' : st.acted ? 'acted' : ''}" data-g="${g}">${portrait(g, 's')}<div><b>${G[g].name}</b>${skillTags(g)}<small>${statLine(g)}</small></div><span class="gs">${loc}</span></div>`;
      }).join('');
    } else {
      let last = '';
      html += s.log.slice().reverse().slice(0, 160).map(l => {
        const head = `${l.y}.${l.m}`;
        const h = head !== last ? `<div class="lg-m">${l.y}년 ${l.m}월</div>` : '';
        last = head;
        return h + `<div class="lg ${l.kind}" ${l.at ? `data-c="${l.at}"` : ''}>${esc(l.text)}</div>`;
      }).join('');
    }
    box.innerHTML = html + '</div>';
    $$('.rp-tabs button', box).forEach(b => b.addEventListener('click', () => { rtab = b.dataset.t; renderRight(); }));
    $$('.gl', box).forEach(el => el.addEventListener('click', () => { const st = s.gens[el.dataset.g]; if (st.st === 'on' && st.city) { onCity(st.city); GMap.focus(st.city, 2.2); } else genCard(el.dataset.g); }));
    $$('.lg[data-c]', box).forEach(el => el.addEventListener('click', () => { onCity(el.dataset.c); GMap.focus(el.dataset.c, 2.2); }));
  }
  function refresh() {
    if (!S()) return;
    renderTop(); renderLeft(); renderRight(); GMap.update();
  }

  // ── 지도 입력
  function onCity(id) {
    if (mode) return;
    sel = id; selFleet = null; selZone = null;
    GMap.select(id); refresh();
  }
  function onZone(id) {
    if (mode && mode.kind !== 'fleet' && mode.kind !== 'sail') return;
    if (mode) return onTarget(id);
    selZone = id; sel = null; selFleet = null; GMap.selectZone(id); refresh();
  }
  function onFleet(id) {
    if (mode) return;
    selFleet = id; sel = null; selZone = null; GMap.select(null); refresh();
  }
  function modeHint(t) { $('#modeHint').textContent = t; $('#modeHint').classList.toggle('on', !!t); }
  function cancelMode() { mode = null; GMap.clearOverlay(); modeHint(''); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode) cancelMode(); });
  async function onTarget(id) {
    const m = mode;
    if (!m) return;
    cancelMode();
    if (m.kind === 'march') return doMarch(m, id);
    if (m.kind === 'sail') return doSail(m, id);
    if (m.kind === 'fleet') return doFleet(m.f, id, null);
    if (m.kind === 'capital') { Game.moveCapital(id); refresh(); }
  }

  // ── 툴팁
  function showTip(kind, id, e) {
    const tip = $('#tip'), s = S();
    let h = '';
    if (kind === 'city') {
      const c = s.cities[id], b = C[id];
      const vis = c.o !== 'japan' || Game.neighbors(id).some(n => ['joseon', 'ming'].includes(s.cities[n].o));
      const gens = Game.gensIn(id);
      h = `<b>${b.name}</b> <small>${b.sub || ''}</small><br><span style="color:${GD.FAC[c.o].soft}">${GD.FAC[c.o].name}</span> · 병력 ${vis ? fmt(c.t) : '약 ' + fmt(Math.round(c.t / 5000) * 5000 || 1000)}${vis && gens.length ? `<br>${gens.slice(0, 4).map(g => G[g].name).join(', ')}${gens.length > 4 ? ' 외' : ''}` : ''}${b.foreign ? '' : `<br>성벽 ${R(c.wall)} · 군량 ${vis ? fmt(c.f) : '?'}`}`;
    } else if (kind === 'zone') {
      const z = GD.SEAS[id];
      h = `<b>${z.name}</b><br>조선·명 함선 ${Game.shipsIn(id, 'allied')} · 일본 함선 ${Game.shipsIn(id, 'japan')}`;
    } else {
      const f = s.fleets.find(x => x.id === id);
      if (!f) return;
      h = `<b>${GD.FAC[f.o].name} 함대</b><br>${Game.shipsLabel(f.s)}<br>${f.g.map(g => G[g].name).join(', ')}`;
    }
    tip.innerHTML = h; tip.classList.add('on');
    const rr = $('.center').getBoundingClientRect();
    tip.style.left = Math.min(rr.width - 220, e.clientX - rr.left + 14) + 'px';
    tip.style.top = Math.max(4, e.clientY - rr.top + 14) + 'px';
  }
  function hideTip() { $('#tip').classList.remove('on'); }

  // ── 명령
  async function pickGen(cmd) {
    const d = Game.CMDS[cmd], cid = sel;
    if (cmd === 'joint') return jointDialog();
    const gens = Game.gensIn(cid).filter(g => !S().gens[g].acted);
    if (!gens.length) return toast('명령을 기다리는 장수가 없습니다.');
    const statKey = d.stat;
    gens.sort((a, b) => G[b][statKey] - G[a][statKey]);
    const c = S().cities[cid], boost = (g, sk) => G[g].skills.includes(sk) ? 1.5 : 1;
    const preview = (g) => {
      if (cmd === 'recruit') return `군사 약 ${fmt(Game.recruitAmount(cid, g))}명 · 재정 ${R(Game.recruitAmount(cid, g) / 7)}`;
      if (cmd === 'farm' || cmd === 'trade') return `${cmd === 'farm' ? '농업' : '상업'} +${R((2 + G[g].pol / 14) * boost(g, 'admin'))}`;
      if (cmd === 'wall') return `성벽 +${R((3 + (G[g].pol + G[g].lea) / 40) * boost(g, 'build'))} (한도 ${Game.wallMax(c)})`;
      if (cmd === 'relief') return `민심 +${R(3 + G[g].cha / 12)}`;
      if (cmd === 'train') return `훈련 +${R(4 + G[g].lea / 12)} (한도 ${Game.trainCap('joseon')})`;
      if (cmd === 'ship') return `판옥선 ${Math.min(Math.floor(S().gold.joseon / 45), 1 + Math.floor(G[g].pol / 35))}척`;
      return '';
    };
    const why0 = Game.canCmd(cmd, cid, gens[0]);
    if (why0 && !gens.some(g => !Game.canCmd(cmd, cid, g))) return toast(why0);
    const v = await dialog({ title: `${d.name} — 장수 고르기`, html: `<p class="muted">${d.desc}</p><div class="pick">${gens.map(g => {
      const why = Game.canCmd(cmd, cid, g);
      return `<button class="pk" data-g="${g}" ${why ? 'disabled' : ''}>${portrait(g, 's')}<span><b>${G[g].name}</b> <small>${({ pol: '정치', cha: '매력', lea: '통솔', int: '지력', war: '무력' })[statKey]} ${G[g][statKey]}</small>${skillTags(g)}<em>${why || preview(g)}</em></span></button>`;
    }).join('')}</div>`, buttons: [{ label: '취소', value: null }], onMount: (root, close) => $$('.pk', root).forEach(b => b.addEventListener('click', () => close(b.dataset.g))) });
    if (!v) return;
    const r = Game.doCmd(cmd, cid, v);
    toast(r.msg);
    refresh();
  }
  function typeOptions(g) {
    const list = GD.FAC_UNITS.joseon.slice();
    if (S().reforms.hullyeon) list.splice(2, 0, 'gun');
    const def = TB.defaultType(g, 'joseon', 0, 3000);
    return list.map(t => `<option value="${t}" ${t === def ? 'selected' : ''}>${GD.UNITS[t].name}</option>`).join('');
  }
  async function marchDialog() {
    const cid = sel, c = S().cities[cid];
    const gens = Game.gensIn(cid).filter(g => !S().gens[g].acted).sort((a, b) => (G[b].lea + G[b].war) - (G[a].lea + G[a].war));
    if (c.t < 100 && !gens.length) return toast('보낼 군사가 없습니다.');
    const v = await dialog({ title: `${C[cid].name}에서 출진`, wide: true, html: `
      <p class="muted">함께 갈 장수(최대 5명)와 병력을 고른 뒤 지도에서 목표를 누르세요. 우리 고을이면 옮기고, 적의 성이면 공격합니다. 한 번에 갈 수 있는 거리는 이동력 ${Game.mpOf('joseon', [])}(기병만이면 +1)입니다.</p>
      <div class="pick multi">${gens.map((g, i) => `<label class="pk"><input type="checkbox" value="${g}" ${i < 2 ? 'checked' : ''}>${portrait(g, 's')}<span><b>${G[g].name}</b> <small>${statLine(g)}</small>${skillTags(g)}</span><select data-g="${g}">${typeOptions(g)}</select></label>`).join('') || '<p class="muted">출진할 장수가 없습니다. 장수 없이 군사만 보낼 수도 있습니다.</p>'}</div>
      <div class="slider"><span>병력</span><input type="range" id="mT" min="100" max="${Math.max(100, c.t)}" step="100" value="${Math.max(100, Math.round(c.t * 0.7 / 100) * 100)}"><b id="mTv"></b><small>남는 병력 <i id="mTl"></i></small></div>`,
      buttons: [{ label: '취소', value: null }, { label: '목표 고르기 ▶', primary: true, get: (root) => ({ gens: $$('input[type=checkbox]:checked', root).map(x => x.value).slice(0, 5), troops: +$('#mT', root).value, types: Object.fromEntries($$('select[data-g]', root).map(s => [s.dataset.g, s.value])) }) }],
      onMount: (root) => {
        const upd = () => { $('#mTv', root).textContent = fmt(+$('#mT', root).value) + '명'; $('#mTl', root).textContent = fmt(c.t - +$('#mT', root).value); };
        $('#mT', root).addEventListener('input', upd); upd();
        $$('input[type=checkbox]', root).forEach(x => x.addEventListener('change', () => { if ($$('input[type=checkbox]:checked', root).length > 5) x.checked = false; }));
      } });
    if (!v) return;
    if (v.troops > c.t) v.troops = c.t;
    const r = Game.reach(cid, 'joseon', Game.mpOf('joseon', v.gens));
    if (!Object.values(r.kind).some(k => k === 'move' || k === 'attack')) return toast('갈 수 있는 곳이 없습니다.');
    mode = { kind: 'march', from: cid, ...v };
    GMap.showReach(r, cid);
    modeHint('파란 고리는 옮기기, 붉은 고리는 공격입니다. 목표를 누르세요. (Esc 취소)');
  }
  async function doMarch(m, to) {
    busy = true; refresh();
    const res = await Game.march('joseon', m.from, m.gens, m.troops, to, { types: m.types });
    busy = false;
    if (!res.ok) { toast(res.msg); refresh(); return; }
    sel = Game.city(to).o === 'joseon' ? to : m.from; GMap.select(sel);
    refresh();
    endIfOver();
  }
  async function sailDialog() {
    const cid = sel, c = S().cities[cid];
    const ships = Object.entries(c.ships).filter(([, n]) => n > 0);
    if (!ships.length) return toast('포구에 배가 없습니다.');
    const gens = Game.gensIn(cid).filter(g => !S().gens[g].acted).sort((a, b) => (G[b].skills.includes('navy') - G[a].skills.includes('navy')) || G[b].lea - G[a].lea);
    const v = await dialog({ title: `${C[cid].name}에서 함대 출진`, wide: true, html: `
      <p class="muted">함대를 이끌 장수와 배를 고른 뒤 지도에서 바다를 누르세요. 적 함대가 있는 바다로 가면 해전이 벌어집니다. 수군 특기 장수가 이끌면 강합니다.</p>
      <div class="pick multi">${gens.map((g, i) => `<label class="pk"><input type="checkbox" value="${g}" ${i < 3 && G[g].skills.includes('navy') ? 'checked' : ''}>${portrait(g, 's')}<span><b>${G[g].name}</b> <small>${statLine(g)}</small>${skillTags(g)}</span></label>`).join('') || '<p class="muted">장수가 없으면 군관이 이끕니다.</p>'}</div>
      ${ships.map(([k, n]) => `<div class="slider"><span>${GD.UNITS[k].name}</span><input type="range" data-k="${k}" min="0" max="${n}" value="${n}"><b>${n}척</b></div>`).join('')}`,
      buttons: [{ label: '취소', value: null }, { label: '바다 고르기 ▶', primary: true, get: (root) => ({ gens: $$('input[type=checkbox]:checked', root).map(x => x.value).slice(0, 6), ships: Object.fromEntries($$('input[data-k]', root).map(x => [x.dataset.k, +x.value]).filter(([, n]) => n > 0)) }) }],
      onMount: (root) => $$('input[data-k]', root).forEach(x => x.addEventListener('input', () => { x.nextElementSibling.textContent = x.value + '척'; })) });
    if (!v || !Object.keys(v.ships).length) return;
    mode = { kind: 'sail', from: cid, ...v };
    GMap.showSeaReach(Game.seaReach(C[cid].port, 'joseon', 3), C[cid].port);
    modeHint('함대가 갈 바다를 누르세요. 지금 바다를 누르면 포구 앞에 진을 칩니다. (Esc 취소)');
  }
  async function doSail(m, zone) {
    busy = true; refresh();
    const res = await Game.sail('joseon', m.from, m.gens, m.ships, zone, {});
    busy = false;
    if (!res.ok) toast(res.msg);
    const f = S().fleets.find(x => x.o === 'joseon' && x.g.some(g => m.gens.includes(g)));
    selFleet = f ? f.id : null; sel = f ? null : m.from;
    refresh(); endIfOver();
  }
  async function doFleet(f, zone, harbor) {
    busy = true; refresh();
    const res = await Game.moveFleet(f, zone, { harbor });
    busy = false;
    if (res && !res.ok) toast(res.msg);
    if (!S().fleets.includes(f)) selFleet = null;
    refresh(); endIfOver();
  }
  async function burnCity() {
    const ok = await dialog({ title: '청야(淸野)', html: `<p>${C[sel].name}의 곡식 창고(군량 ${fmt(S().cities[sel].f)}석)를 불태울까요? 적이 이 성을 차지해도 군량을 얻지 못합니다. 민심이 10 떨어집니다.</p>`, buttons: [{ label: '취소', value: false }, { label: '불태운다', value: true, danger: true }] });
    if (ok) { Game.burn(sel); refresh(); }
  }
  async function reformDialog() {
    const now = Game.nowYm();
    const v = await dialog({ title: '개혁', wide: true, html: `<div class="reforms">${Object.entries(Game.REFORMS).map(([id, r]) => {
      const done = S().reforms[id], early = now < Game.ym(...r.from);
      return `<button class="rf ${done ? 'done' : ''}" data-r="${id}" ${done || early ? 'disabled' : ''}><b>${r.name}</b> <small>${done ? '시행함' : early ? `${r.from[0]}년 ${r.from[1]}월부터` : '재정 ' + r.cost}</small><span>${r.desc}</span></button>`;
    }).join('')}</div>`, buttons: [{ label: '닫기', value: null }], onMount: (root, close) => $$('.rf', root).forEach(b => b.addEventListener('click', () => close(b.dataset.r))) });
    if (!v) return;
    const r = Game.reform(v); toast(r.msg); refresh();
  }
  function capitalMode() {
    const r = Game.reach(S().capital, 'joseon', 4);
    const mv = Object.fromEntries(Object.entries(r.kind).filter(([, k]) => k === 'move'));
    if (!Object.keys(mv).length) return toast('옮길 수 있는 고을이 없습니다.');
    r.kind = mv;
    mode = { kind: 'capital' };
    GMap.showReach(r, S().capital);
    modeHint('조정을 옮길 고을을 누르세요. 민심이 조금 떨어집니다. (Esc 취소)');
  }
  async function jointDialog() {
    const targets = Game.citiesOf('japan');
    if (!Game.citiesOf('ming').length && !S().cities.liaodong.t) return toast('조선에 와 있는 명군이 없습니다.');
    const v = await dialog({ title: '명군에 공동 작전 요청', html: `<p class="muted">명군에게 먼저 칠 곳을 청합니다. 명군은 이길 수 있다고 볼 때 움직입니다.</p><div class="pick">${targets.map(id => `<button class="pk" data-c="${id}"><span><b>${C[id].name}</b> <small>${GD.DO[C[id].do]}</small></span></button>`).join('')}</div>`,
      buttons: [{ label: '취소', value: null }], onMount: (root, close) => $$('.pk', root).forEach(b => b.addEventListener('click', () => close(b.dataset.c))) });
    if (!v) return;
    const g = Game.gensIn(sel).filter(x => !S().gens[x].acted).sort((a, b) => G[b].cha - G[a].cha)[0];
    if (!g) return toast('명령을 기다리는 장수가 없습니다.');
    const r = Game.doCmd('joint', sel, g, v); toast(r.msg); refresh();
  }
  function genCard(g) {
    const d = G[g], b = bio(g), st = S().gens[g];
    dialog({ title: d.name, html: `<div class="gcard">${portrait(g, 'l')}<div><p><b>${GD.FAC[d.fac].name}</b>${b.role ? ' · ' + esc(b.role) : ''}${b.life ? ` <small>(${b.life})</small>` : ''}</p>
      <div class="gstats">${[['통솔', d.lea], ['무력', d.war], ['지력', d.int], ['정치', d.pol], ['매력', d.cha]].map(([k, v]) => `<div><span>${k}</span><span class="bar"><i style="width:${v}%"></i></span><b>${v}</b></div>`).join('')}</div>
      <p>${skillTags(g) || ''}</p><p class="muted">${st.st === 'dead' ? '세상을 떠났습니다.' : st.st === 'captive' ? '적에게 사로잡혀 있습니다.' : st.st === 'out' ? '백의종군 중입니다.' : ''}</p></div></div>
      <p class="bio">${esc(b.text)}</p><p class="muted small">능력치는 게임을 위한 가상의 값입니다.</p>` });
  }

  // ── 전투 연결
  Game.hooks.animate = (path, fac, kind) => GMap.animate(path, fac, kind);
  Game.hooks.change = () => { GMap.update(); renderTop(); };
  Game.hooks.battle = async (spec) => {
    const hist = histNote(spec);
    const pside = spec.player;
    const aName = GD.FAC[spec.att.fac].name, dName = GD.FAC[spec.def.fac].name;
    const where = spec.kind === 'land' ? C[spec.city].name : (spec.harbor ? C[spec.harbor].name + ' 포구' : GD.SEAS[spec.zone].name);
    const sideTxt = (sp) => spec.kind === 'land' ? `${fmt(sp.troops)}명` : Game.shipsLabel(sp.ships);
    const gnames = (sp) => (sp.gens || []).filter(g => !G[g].skills.includes('king')).slice(0, 4).map(g => G[g].name).join(', ') || '이름 없는 장수';
    if (!pside) {
      const res = TB.simulate(spec);
      GMap.flash(spec.kind === 'land' ? spec.city : spec.zone, res.win);
      return res;
    }
    let how = 'tactic';
    const mine = pside === 'att' ? spec.att : spec.def;
    const small = spec.kind === 'land' && pside === 'def' && (!mine.gens.length || mine.troops < 600);
    const askDef = pside === 'def' && (prefs.ask === 'always' || (prefs.ask === 'gen' && !small));
    if (pside === 'def' && !askDef) how = 'auto';
    else {
      const html = `<div class="bprompt"><div class="bp-side" style="--fc:${GD.FAC[spec.att.fac].color}"><b>${aName} (공격)</b><span>${sideTxt(spec.att)}</span><small>${esc(gnames(spec.att))}</small></div><div class="bp-vs">VS</div>
        <div class="bp-side" style="--fc:${GD.FAC[spec.def.fac].color}"><b>${dName} (수비)</b><span>${sideTxt(spec.def)}</span><small>${esc(gnames(spec.def))}</small></div></div>
        ${(spec.att.allies || []).length ? `<p class="muted">함께 싸우는 동맹군: ${spec.att.allies.map(a => `${GD.FAC[a.fac].name} ${fmt(a.troops)}명`).join(', ')}</p>` : ''}
        ${spec.kind === 'land' && spec.def.wall ? `<p class="muted">${({ eup: '읍성', san: '산성', wae: '왜성' })[spec.def.castle]} 성벽 ${R(spec.def.wall)}</p>` : ''}`;
      const btns = [{ label: '직접 지휘', value: 'tactic', primary: true }, { label: '위임 (결과만)', value: 'auto' }];
      if (pside === 'def' && spec.kind === 'land') btns.push({ label: '성을 버리고 물러난다', value: 'flee', danger: true });
      how = await dialog({ title: `${where} — ${pside === 'def' ? `${aName}군이 쳐들어옵니다` : '전투'}`, html, buttons: btns, noClose: true });
    }
    if (how === 'flee') {
      Game.burn(spec.city);
      return { win: 'att', why: '수비군이 성을 비우고 물러났습니다', att: { left: spec.att.troops, gens: spec.att.gens.map(id => ({ id, fate: 'ok' })), ships: spec.att.ships, allies: [] }, def: { left: spec.def.troops, gens: spec.def.gens.map(id => ({ id, fate: 'ok' })) }, wallLeft: 1, days: 0 };
    }
    if (how === 'auto') {
      const res = TB.simulate(spec);
      const won = (res.win === 'att') === (pside === 'att');
      if (!askDef && pside === 'def') {
        // 묻지 않고 위임한 방어전은 알림으로만
        GMap.flash(spec.kind === 'land' ? spec.city : spec.zone, res.win);
        toast(`${where}: ${won ? '막아 냈습니다' : '지키지 못했습니다'} — ${res.why}`);
        return res;
      }
      await dialog({ title: `${where} 전투 결과`, html: `<div class="bres ${won ? 'win' : 'lose'}"><span class="bseal">${won ? '勝' : '敗'}</span><p>${res.why}</p><p>${resultLine(spec, res)}</p>${fatesLine(res)}${hist ? `<div class="tb-hist">${hist}</div>` : ''}</div>`, buttons: [{ label: '확인', value: true, primary: true }] });
      return res;
    }
    $('#battle').classList.remove('hidden');
    const res = await TB.run(spec, { root: $('#battle'), hist, speed: prefs.bspeed });
    $('#battle').classList.add('hidden');
    $('#battle').innerHTML = '';
    return res;
  };
  function resultLine(spec, res) {
    if (spec.kind === 'land') return `공격군 ${fmt(spec.att.troops)} → ${fmt(res.att.left)}명 · 수비군 ${fmt(spec.def.troops)} → ${fmt(res.def.left)}명`;
    const n = (s) => Object.values(s || {}).reduce((a, b) => a + b, 0);
    return `공격 함대 ${n(spec.att.ships)} → ${n(res.att.ships)}척 · 수비 함대 ${n(spec.def.ships)} → ${n(res.def.ships)}척`;
  }
  function fatesLine(res) {
    const f = [...res.att.gens, ...res.def.gens].filter(g => g.fate !== 'ok');
    return f.length ? `<p class="fates">${f.map(g => `${G[g.id].name} ${g.fate === 'dead' ? '전사' : '포로'}`).join(' · ')}</p>` : '';
  }
  // 도성이 공격받기 직전: 피란할지 묻는다
  Game.hooks.capitalThreat = async (cid) => {
    if (S().flags.stayed) return;
    const to = Game.fleeTarget(cid);
    const v = await event({ seal: '蒙塵', gen: 'seonjo', title: `적이 ${C[cid].name}을(를) 치려 합니다`, date: `${S().y}년 ${S().m}월`,
      body: `<p>일본군이 조정이 있는 ${C[cid].name}으로 밀려옵니다. 임금을 피란시킬까요?</p>`,
      choices: [
        to ? { v: 'flee', label: `${C[to].name}(으)로 피란한다`, note: '조정은 안전해지지만 민심이 흔들립니다. 성은 남은 군사가 지킵니다.' } : null,
        { v: 'stay', label: '끝까지 지킨다', note: '성이 무너지면 임금이 사로잡힐 수도 있습니다.' },
      ].filter(Boolean), hist: ['e07'] });
    if (v === 'flee' && to) {
      Game.moveCapital(to);
      for (const g of ['ryu', 'yihb', 'yidh', 'ydsu']) if (S().gens[g].st === 'on' && S().gens[g].city === cid && !S().gens[g].acted) S().gens[g].city = to;
      refresh();
    } else S().flags.stayed = true;
  };
  // 명군이 공격할 때 함께 싸울지 묻는다
  Game.hooks.invite = async (fac, from, target, force) => {
    const s = S();
    const cand = Game.landNeighbors(target).filter(n => s.cities[n].o === 'joseon' && s.cities[n].t >= 1500);
    if (!cand.length) return null;
    const best = cand.sort((a, b) => s.cities[b].t - s.cities[a].t)[0];
    const c = s.cities[best];
    const gens = Game.gensIn(best).filter(g => !s.gens[g].acted).slice(0, 3);
    const v = await dialog({ title: `명군이 ${C[target].name}을(를) 칩니다`, html: `<p>명군 ${fmt(force)}명이 ${C[target].name}을(를) 공격하려 합니다. 이웃한 ${C[best].name}의 군사가 함께 싸울까요?</p>
      <div class="slider"><span>보낼 병력</span><input type="range" id="jT" min="0" max="${Math.max(0, c.t - 500)}" step="100" value="${Math.round((c.t - 500) * 0.6 / 100) * 100}"><b id="jTv"></b></div>
      <p class="muted">${gens.length ? gens.map(g => G[g].name).join(', ') + '이(가) 이끕니다.' : '군관이 이끕니다.'} 명군이 지휘하므로 전투는 컴퓨터가 치릅니다.</p>`,
      buttons: [{ label: '보내지 않는다', value: null }, { label: '함께 싸운다', primary: true, get: (root) => +$('#jT', root).value }], noClose: true,
      onMount: (root) => { const u = () => { $('#jTv', root).textContent = fmt(+$('#jT', root).value) + '명'; }; $('#jT', root).addEventListener('input', u); u(); } });
    if (!v) return null;
    for (const g of gens) s.gens[g].acted = true;
    return { fac: 'joseon', from: best, gens, troops: v };
  };

  // ── 턴
  async function endTurn() {
    if (busy) return;
    const s = S();
    const idle = Game.gensOf('joseon').filter(g => !s.gens[g].acted && !G[g].skills.includes('king') && s.gens[g].city && !s.cities[s.gens[g].city].dele);
    if (idle.length > 3) {
      const ok = await dialog({ title: '턴 마치기', html: `<p>아직 명령을 받지 않은 장수가 ${idle.length}명 있습니다. 이대로 턴을 마칠까요?</p><p class="muted">고을마다 "내정 위임"을 켜 두면 남은 장수가 알아서 내정을 합니다.</p>`, buttons: [{ label: '돌아가기', value: false }, { label: '턴 마치기', value: true, primary: true }] });
      if (!ok) return;
    }
    busy = true; cancelMode(); refresh();
    const logStart = s.log.length;
    for (const id of Game.citiesOf('joseon')) if (s.cities[id].dele) Game.autoCity(id);
    banner('일본군이 움직입니다…');
    await AI.run('japan');
    if (endIfOver()) return;
    await GEV.check('ai');
    if (endIfOver()) return;
    if (Game.citiesOf('ming').length || s.cities.liaodong.t > 0) { banner('명군이 움직입니다…'); await AI.run('ming'); }
    banner('');
    const ym0 = `${s.y}년 ${s.m}월`;
    const rep = Game.monthEnd();
    const events = s.log.slice(logStart).filter(l => ['win', 'loss', 'death'].includes(l.kind)).map(l => `<li class="${l.kind}">${esc(l.text)}</li>`);
    Game.advance();
    refresh();
    await dialog({ title: `${ym0} 보고`, html: `<ul class="report">${rep.map(r => `<li>${esc(r)}</li>`).join('')}${events.join('')}</ul>`, buttons: [{ label: `${s.y}년 ${s.m}월로`, value: true, primary: true }] });
    await GEV.check('start');
    if (endIfOver()) return;
    s.phase = 'player'; busy = false;
    autosave();
    refresh();
  }
  function endIfOver() {
    const e = Game.checkEnd();
    if (!e.over) return false;
    busy = true; banner('');
    ending(e);
    return true;
  }
  async function ending(e) {
    const sc = Game.score(), s = S();
    const [seal, word, line] = sc.grade;
    try { localStorage.removeItem('imjin_game_auto'); } catch (x) { /* 무시 */ }
    await dialog({ title: '전쟁이 끝났습니다', wide: true, noClose: true, html: `<div class="ending">
      <div class="end-seal">${seal}</div><h2>${word}</h2><p class="end-why">${e.reason}</p><p>${line}</p>
      <dl class="end-dl"><dt>점수</dt><dd>${sc.pts}</dd><dt>지킨 고을</dt><dd>${sc.mine} / ${sc.total}</dd><dt>전투</dt><dd>${s.stats.won}승 ${s.stats.lost}패</dd>
      <dt>무찌른 적</dt><dd>${fmt(s.stats.kills)}</dd><dt>잃은 군사</dt><dd>${fmt(s.stats.losses)}</dd><dt>평균 민심</dt><dd>${sc.order}</dd></dl>
      ${s.stats.great.length ? `<h4>대첩</h4><ul>${s.stats.great.map(g => `<li>${g.y}년 ${g.m}월 ${esc(g.title)} — 적 ${fmt(g.kills)} / 아군 ${fmt(g.loss)}</li>`).join('')}</ul>` : ''}
      <div class="end-hist"><b>실제 역사에서는</b><p>7년의 전쟁 끝에 일본군은 물러갔지만, 조선은 인구와 농토가 크게 줄고 경복궁·불국사 같은 문화재가 불탔으며 수많은 사람이 일본으로 끌려갔습니다. 일본에서는 도쿠가와 이에야스가 권력을 잡았고, 명은 국력이 기울어 뒤에 청에게 무너졌습니다.</p>
      <a href="../#e33" target="_blank" rel="noopener">원래 지도 프로그램에서 전쟁의 결과 보기 ↗</a></div></div>`,
      buttons: [{ label: '처음 화면으로', value: true, primary: true }] });
    busy = false;
    title();
  }
  function autosave() { Game.save('auto'); }

  // ── 저장·불러오기·설정·도움말
  async function saveDialog() {
    if (busy) return;
    const slots = [1, 2, 3];
    const v = await dialog({ title: '저장', html: `<div class="slots">${slots.map(i => { const s = Game.slotInfo(i); return `<button class="slot" data-i="${i}"><b>${i}번 칸</b><span>${s ? `${s.y}년 ${s.m}월 · ${GD.SCEN[s.scen].title} · 조선 고을 ${s.cities}` : '비어 있음'}</span></button>`; }).join('')}</div><p class="muted">이 브라우저에만 저장됩니다.</p>`,
      buttons: [{ label: '닫기', value: null }], onMount: (root, close) => $$('.slot', root).forEach(b => b.addEventListener('click', () => close(b.dataset.i))) });
    if (!v) return;
    toast(Game.save(v) ? `${v}번 칸에 저장했습니다.` : '저장하지 못했습니다. (브라우저 저장소를 쓸 수 없음)');
  }
  async function loadDialog() {
    const slots = ['auto', 1, 2, 3];
    const v = await dialog({ title: '불러오기', html: `<div class="slots">${slots.map(i => { const s = Game.slotInfo(i); return `<button class="slot" data-i="${i}" ${s ? '' : 'disabled'}><b>${i === 'auto' ? '자동 저장' : i + '번 칸'}</b><span>${s ? `${s.y}년 ${s.m}월 · ${GD.SCEN[s.scen].title} · 조선 고을 ${s.cities}` : '비어 있음'}</span></button>`; }).join('')}</div>`,
      buttons: [{ label: '닫기', value: null }], onMount: (root, close) => $$('.slot', root).forEach(b => b.addEventListener('click', () => close(b.dataset.i))) });
    if (!v) return;
    if (Game.load(v)) resume(); else toast('불러오지 못했습니다.');
  }
  async function settings() {
    const v = await dialog({ title: '설정', html: `
      <div class="ti-row"><span>지도 애니메이션</span><select id="sSp"><option value="0">끔</option><option value="0.6">느리게</option><option value="1">보통</option><option value="2">빠르게</option></select></div>
      <div class="ti-row"><span>전투 애니메이션</span><select id="sBs"><option value="0.6">느리게</option><option value="1">보통</option><option value="2">빠르게</option></select></div>
      <div class="ti-row"><span>적이 쳐들어올 때</span><select id="sAsk"><option value="always">언제나 묻기</option><option value="gen">장수가 있거나 병력이 많을 때 묻기</option><option value="never">묻지 않고 위임</option></select></div>`,
      buttons: [{ label: '취소', value: null }, { label: '저장', primary: true, get: (root) => ({ speed: +$('#sSp', root).value, bspeed: +$('#sBs', root).value, ask: $('#sAsk', root).value }) }],
      onMount: (root) => { $('#sSp', root).value = String(prefs.speed); $('#sBs', root).value = String(prefs.bspeed); $('#sAsk', root).value = prefs.ask; } });
    if (!v) return;
    Object.assign(prefs, v); savePrefs(); GMap.speed = prefs.speed;
  }
  function help() {
    return dialog({ title: '게임 방법', wide: true, html: `<div class="help">
      <h4>목표</h4><p>조선의 조정을 이끌어 1592년 4월부터 1598년 말까지 나라를 지키십시오. 임금이 사로잡히거나 모든 고을을 잃으면 집니다. 전쟁이 끝났을 때 지킨 고을·민심·대첩으로 평가합니다.</p>
      <h4>한 턴</h4><p>한 턴은 한 달입니다(강화 협상기에는 석 달). 고을을 누르고 장수에게 명령을 내린 뒤 <b>턴 종료</b>를 누르면 일본군과 명군이 움직이고, 달말에 재정·수확·보급을 계산합니다. 장수는 한 달에 한 번 명령을 받습니다.</p>
      <h4>명령</h4><ul><li><b>내정</b> — 개간(농업, 가을 수확), 상업(재정), 축성(성벽), 구휼(민심)</li><li><b>군사</b> — 출진(옮기기·공격), 징병, 훈련, 청야(곡식 창고 불태우기)</li><li><b>수군</b> — 함대 출진, 판옥선·거북선 건조</li><li><b>인사</b> — 창의 독려(이웃 점령지의 의병 활동↑)</li><li><b>외교</b> — 명에 원군 요청, 공동 작전</li><li><b>국정</b> — 개혁(훈련도감·속오군·산성 수축 등), 조정 옮기기</li></ul>
      <h4>전투</h4><p>적의 성을 공격하거나 공격받으면 육각형 칸 전장에서 싸웁니다. 부대를 눌러 이동(파란 칸)·공격(붉은 고리)·계략을 명령하세요. 기병은 평지에서 강하고 논·숲·산에서 약합니다. 조선의 활은 조총보다 멀리 쏘지만 위력이 약합니다. 성은 성문·성벽을 부수고 <b>본진</b>을 차지하면 함락됩니다. 지휘하기 번거로우면 <b>위임</b>이나 <b>즉시 결과</b>를 누르세요. 총대장(★)이 쓰러지면 집니다.</p>
      <h4>해전</h4><p>판옥선은 총통으로 멀리서 쏘고, 일본 배는 붙어서 배에 오르려 합니다(등선육박전). 거북선은 적이 오를 수 없습니다. 명량 같은 좁은 물목은 물살이 중간에 바뀝니다.</p>
      <h4>보급과 의병</h4><p>군사는 달마다 군량을 먹습니다. 같은 편 고을끼리 길로 이어져 있으면 군량이 저절로 오갑니다. 일본군은 부산으로 들어오는 본국 군량에 기대므로, <b>남해 바다를 조선 수군이 지키면</b> 서해 뱃길이 막히고, <b>의병</b>이 점령지의 보급을 빼앗습니다.</p>
      <h4>명</h4><p>명군은 컴퓨터가 움직이는 동맹군입니다. 원군 요청을 많이 하면 대군이 일찍 옵니다. 명군 옆의 적 성을 치면 명군이 함께 싸우고, 명군의 군량 일부는 조선이 댑니다.</p>
      <h4>역사 사건</h4><p>명의 참전·강화 협상·정유재란·도요토미의 죽음 같은 큰 사건은 실제 시기에 일어납니다. 사건 창과 전투 결과의 "실제 역사" 링크를 누르면 원래 지도 프로그램에서 그 사건을 볼 수 있습니다.</p>
      <p class="muted">장수 능력치와 고을 수치는 게임을 위한 가상의 값입니다.</p></div>`, buttons: [{ label: '닫기', value: true, primary: true }] });
  }

  // ── 시작
  document.addEventListener('DOMContentLoaded', () => {
    $('#tEnd').addEventListener('click', endTurn);
    $('#tSave').addEventListener('click', saveDialog);
    $('#tLoad').addEventListener('click', () => { if (!busy) loadDialog(); });
    $('#tSet').addEventListener('click', settings);
    $('#tHelp').addEventListener('click', help);
    $('#tTitle').addEventListener('click', async () => { if (busy) return; if (await dialog({ title: '처음 화면으로', html: '<p>처음 화면으로 갈까요? 이번 턴 처음 상태가 자동 저장되어 있습니다.</p>', buttons: [{ label: '취소', value: false }, { label: '처음 화면', value: true, primary: true }] })) title(); });
    $('#zIn').addEventListener('click', () => GMap.zoomIn());
    $('#zOut').addEventListener('click', () => GMap.zoomOut());
    $('#zFit').addEventListener('click', () => GMap.fit());
    $('#zSouth').addEventListener('click', () => GMap.focusSouth());
    title();
  });

  return { event, dialog, toast, refresh, start, help };
})();

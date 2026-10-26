// 칠년전쟁 — 역사 사건 (큰 사건은 실제 시기에 일어나고, 전투 결과와 점령지는 플레이에 따라 달라진다)
// at: [년, 월] 이 시기부터 조건이 맞으면 한 번 일어난다. when: 'start'(달 초) · 'ai'(적이 움직인 뒤)
const GEV = (() => {
  const C = GD.CITIES;
  const S = () => Game.S;
  const ym = (y, m) => y * 12 + m - 1;
  const on = (g) => S().gens[g] && S().gens[g].st === 'on';
  const own = (id, f = 'japan') => S().cities[id].o === f;
  const jp = (ids) => ids.some(id => own(id));
  const name = (g) => GD.GENS[g].name;
  function moveGen(g, to) { if (S().gens[g].st === 'on' && !S().gens[g].fleet) S().gens[g].city = to; }
  function spawn(list, at, troops) {
    const out = [];
    for (const g of list) {
      if (S().gens[g].st !== 'off') continue;
      const cid = Game.spawnGen(g, at, troops);
      if (cid) { out.push([g, cid]); troops = 0; }
    }
    return out;
  }
  const where = (pairs) => pairs.map(([g, c]) => `${name(g)}(${C[c].name})`).join(', ');

  const EV = [
    // ───── 1592
    { id: 'open1592', scen: 's1592', when: 'opening', run: async () => {
      await UI.event({
        seal: '壬辰', title: '임진년 4월, 왜란이 일어나다', date: '1592년 4월 13일',
        body: `<p>고니시 유키나가가 이끄는 일본군 1군 1만 8천여 명이 7백여 척의 배를 타고 부산 앞바다에 나타났습니다. 도요토미 히데요시는 "명을 치러 갈 길을 빌려 달라(정명가도)"며 15만이 넘는 대군을 조선에 보냈습니다.</p>
          <p>오랜 평화 속에 조선의 군사 제도는 허술해져 있었습니다. 일본군은 1백 년 넘게 이어진 내전으로 단련되었고, 조총으로 무장했습니다.</p>
          <p class="ev-tip">당신은 조선의 조정을 이끕니다. 고을을 눌러 장수에게 명령을 내리고, 일본군의 북상을 늦추며 <b>수군</b>·<b>의병</b>·<b>명의 원군</b>으로 7년 전쟁을 이겨 내십시오. 일본군이 먼저 움직입니다.</p>`,
        hist: ['e01', 'tongsinsa'],
      });
    } },
    { id: 'open1597', scen: 's1597', when: 'opening', run: async () => {
      await UI.event({
        seal: '丁酉', title: '정유년, 왜군이 다시 바다를 건너다', date: '1597년 1월',
        body: `<p>4년 가까이 이어진 명과 일본의 강화 협상이 깨졌습니다. 1월에 가토 기요마사가 다시 바다를 건너오고, 7월에는 14만 대군이 뒤따를 것입니다. 이번 목표는 지난 전쟁에서 차지하지 못한 <b>전라도</b>입니다.</p>
          <p>그사이 조선은 훈련도감을 세워 조총병을 기르고 산성을 고쳐 쌓았습니다. 삼도수군통제사 이순신은 한산도 통제영에서 함대를 이끌고 있습니다.</p>`,
        hist: ['e24'],
      });
    } },
    { id: 'gwak', scen: 's1592', at: [1592, 4], when: 'ai', run: async () => {
      const a = spawn(['gwakjaewoo'], 'uiryeong', 1200);
      if (!a.length) return;
      await UI.event({ seal: '紅衣', gen: 'gwakjaewoo', title: '홍의장군 곽재우, 의병을 일으키다', date: '1592년 4월 22일',
        body: `<p>의령의 선비 곽재우가 집안 재산을 털어 의병을 일으켰습니다. 붉은 옷을 입고 앞장서 싸워 "홍의장군"이라 불렸습니다.</p><p>${where(a)}에 의병 1,200명이 모였습니다. 의병은 고향 산천을 잘 알아 숲과 산에서 강하고, 점령지의 일본군 보급로를 괴롭힙니다.</p>`, hist: ['e04'] });
    } },
    { id: 'gyeongsang_uib', scen: 's1592', at: [1592, 5], run: async () => {
      const a = spawn(['kimmyeon'], 'seongju', 1000).concat(spawn(['jih'], 'hamyang', 800));
      if (!a.length) return;
      await UI.event({ seal: '倡義', title: '경상우도에 의병이 잇따르다', date: '1592년 5월',
        body: `<p>고령·거창의 김면, 합천의 정인홍이 의병을 일으켰습니다. 경상우도 초유사 김성일은 고을을 돌며 의병을 모으고 관군과 의병이 함께 싸우도록 힘썼습니다.</p><p>합류: ${where(a)}</p>` });
    } },
    { id: 'okpo_hint', scen: 's1592', at: [1592, 5], cond: () => on('yisunsin') && !S().fleets.some(f => f.o === 'joseon'), run: async () => {
      await UI.event({ seal: '水軍', gen: 'yisunsin', title: '원균이 이순신에게 구원을 청하다', date: '1592년 5월',
        body: `<p>경상우수사 원균의 수군은 일본군에게 밀려 거의 흩어졌습니다. 원균은 전라좌수사 이순신에게 구원을 청했습니다.</p>
          <p class="ev-tip">여수(전라좌수영)를 눌러 <b>수군 → 함대 출진</b>으로 이순신 함대를 거제·견내량 바다로 내보내 보십시오. 일본 수군을 무찌르고 남해 바다를 지키면 <b>일본군의 서해 보급 뱃길</b>이 끊깁니다. 지도에서 붉게 빛나는 바다가 일본이 쓰고 있는 뱃길입니다.</p>`, hist: ['e08'] });
    } },
    { id: 'mongjin', cond: () => S().capital === 'hanyang' && own('hanyang', 'joseon') && Game.landNeighbors('hanyang').some(n => own(n)), when: 'ai', run: async () => {
      const v = await UI.event({ seal: '蒙塵', gen: 'seonjo', title: '적이 도성 가까이 다가오다', date: `${S().y}년 ${S().m}월`,
        body: `<p>일본군이 한양 바로 앞까지 밀려왔습니다. "도성을 버려서는 안 된다"는 신하와 "일단 몸을 피해 나라를 보전해야 한다"는 신하가 맞섭니다.</p>`,
        choices: [
          { v: 'flee', label: '평양으로 피란한다', note: '실제 역사의 선택. 조정은 안전해지지만 민심이 흔들립니다.' },
          { v: 'stay', label: '도성을 끝까지 지킨다', note: '도성 백성 3천 명이 성을 지키러 나섭니다. 한양이 무너지면 임금이 사로잡힐 수도 있습니다.' },
        ], hist: ['e07'] });
      if (v === 'flee') {
        const to = Game.fleeTarget('hanyang');
        if (to) Game.moveCapital(to);
        for (const g of ['ryu', 'yihb', 'yidh', 'ydsu']) if (on(g) && S().gens[g].city === 'hanyang') moveGen(g, to);
        S().cities.hanyang.mo = Math.max(10, S().cities.hanyang.mo - 15);
      } else {
        S().cities.hanyang.t += 3000; S().cities.hanyang.mo = Math.min(100, S().cities.hanyang.mo + 15);
        S().flags.stayed = true;
      }
    } },
    { id: 'mongjin2', cond: () => S().capital === 'pyongyang' && own('pyongyang', 'joseon') && Game.landNeighbors('pyongyang').some(n => own(n)), when: 'ai', run: async () => {
      const v = await UI.event({ seal: '蒙塵', gen: 'seonjo', title: '평양마저 위태롭다', date: `${S().y}년 ${S().m}월`,
        body: '<p>일본군이 대동강 건너편까지 다가왔습니다. 의주까지 물러나면 압록강 너머 명의 땅이 바로 앞입니다.</p>',
        choices: [{ v: 'flee', label: '의주로 피란한다', note: '실제 역사의 선택. 선조는 명으로 건너갈 생각까지 했습니다.' }, { v: 'stay', label: '평양을 지킨다', note: '평양이 무너지면 임금이 위험합니다.' }], hist: ['e10'] });
      if (v === 'flee' && own('uiju', 'joseon')) {
        Game.moveCapital('uiju');
        for (const g of ['ryu', 'yihb', 'yidh', 'ydsu']) if (on(g) && S().gens[g].city === 'pyongyang') moveGen(g, 'uiju');
      }
    } },
    { id: 'gwanghae', scen: 's1592', at: [1592, 6], run: async () => {
      const at = ['anju', 'pyongyang', 'wonju', 'haeju'].find(id => own(id, 'joseon')) || S().capital;
      const a = spawn(['gwanghae'], at, 0);
      if (!a.length) return;
      await UI.event({ seal: '分朝', gen: 'gwanghae', title: '광해군의 분조', date: '1592년 6월',
        body: `<p>임금은 둘째 아들 광해군을 서둘러 세자로 세우고, 조정을 둘로 나누어(분조) 나라 일의 절반을 맡겼습니다. 광해군은 강원·황해·평안도를 돌며 군사를 모으고 백성을 달랬습니다.</p><p>광해군이 ${C[a[0][1]].name}에 머뭅니다. 매력이 높아 징병과 창의 독려에 뛰어납니다.</p>` });
    } },
    { id: 'jeolla_uib', scen: 's1592', at: [1592, 6], run: async () => {
      const a = spawn(['gogm'], 'gwangju', 2500).concat(spawn(['kimcheonil'], 'naju', 1500));
      if (!a.length) return;
      await UI.event({ seal: '倡義', gen: 'gogm', title: '호남의 의병', date: '1592년 6월',
        body: `<p>담양에서 고경명이 6천여 명의 의병을 모았고, 나주에서는 김천일이 일어났습니다. 고경명은 "임금이 계신 곳으로 달려가자"는 격문을 돌렸습니다.</p><p>합류: ${where(a)}</p>` });
    } },
    { id: 'ming1', at: [1592, 7], cond: () => jp(['pyongyang', 'hanyang', 'hwangju', 'gaeseong']), run: async () => {
      const n = S().aid >= 1 ? 5000 : 3000;
      spawn(['joseunghun'], 'liaodong', 0);
      S().cities.liaodong.t += n; S().cities.liaodong.tr = 70; S().cities.liaodong.mo = 75; S().cities.liaodong.f += n * 2;
      S().flags.mingIn = true;
      await UI.event({ seal: '天兵', gen: 'joseunghun', title: '명의 첫 원군', date: '1592년 7월',
        body: `<p>조선의 거듭된 요청에 명이 요동의 부총병 조승훈에게 군사 ${n.toLocaleString()}명을 주어 압록강을 건너게 했습니다.</p><p class="ev-tip">명군은 컴퓨터가 움직이는 동맹군입니다. 외교 → <b>공동 작전</b>으로 칠 곳을 청할 수 있고, 명군이 있는 성 옆을 공격하면 명군이 함께 싸웁니다.</p>`, hist: ['e13'] });
    } },
    { id: 'chung_uib', scen: 's1592', at: [1592, 7], run: async () => {
      const a = spawn(['joheon'], 'gongju', 1600).concat(spawn(['yeonggyu'], 'gongju', 800)).concat(spawn(['hongkn'], 'suwon', 800)).concat(spawn(['kwoneungsu'], 'gyeongju', 1500));
      if (!a.length) return;
      await UI.event({ seal: '倡義', gen: 'joheon', title: '충청·경기·경상좌도의 의병', date: '1592년 7월',
        body: `<p>옥천의 조헌과 공주 갑사의 승려 영규가 손을 잡았고, 안성의 홍계남, 영천의 권응수도 일어났습니다. 권응수는 영천성을 되찾아 경상좌도 일본군의 연결을 끊었습니다.</p><p>합류: ${where(a)}</p>`, hist: ['e15'] });
    } },
    { id: 'monks', scen: 's1592', at: [1592, 7], run: async () => {
      const at = ['anju', 'pyongyang', 'uiju'].find(id => own(id, 'joseon')) || S().capital;
      const a = spawn(['hyujeong'], at, 1500).concat(spawn(['samyeong'], at, 800));
      if (!a.length) return;
      await UI.event({ seal: '僧兵', gen: 'hyujeong', title: '서산대사의 격문', date: '1592년 7월',
        body: `<p>임금의 부탁을 받은 서산대사 휴정이 전국의 승려들에게 격문을 보냈습니다. 묘향산에서 승병이 일어났고, 금강산에 있던 제자 사명대사 유정도 승병을 이끌고 왔습니다.</p><p>합류: ${where(a)}. 승병은 쉽게 무너지지 않습니다.</p>` });
    } },
    { id: 'yeonan', scen: 's1592', at: [1592, 8], run: async () => {
      const a = spawn(['yijeongam'], 'yeonan', 600).concat(spawn(['choigh'], 'gwangju', 800));
      if (!a.length) return;
      await UI.event({ seal: '倡義', title: '이정암과 최경회', date: '1592년 8월',
        body: `<p>황해도 연안에서 이정암이 의병을 모아 성을 지키기로 했고, 전라도 화순에서는 최경회가 일어났습니다.</p><p>합류: ${where(a)}</p>`, hist: ['yeonan'] });
    } },
    { id: 'princes', at: [1592, 7], cond: () => own('hoeryong'), run: async () => {
      S().uib.hamgyeong = Math.min(100, S().uib.hamgyeong + 20);
      await UI.event({ seal: '王子', title: '회령에서 두 왕자가 사로잡히다', date: `${S().y}년 ${S().m}월`,
        body: '<p>근왕병을 모으러 함경도에 갔던 임해군과 순화군이 회령에서 반란을 일으킨 아전 국경인에게 붙잡혀 가토 기요마사에게 넘겨졌습니다. 이 일에 분노한 함경도 사람들이 들고일어납니다. (함경도 의병 활동 +20)</p>', hist: ['e14'] });
    } },
    { id: 'bukgwan', at: [1592, 9], cond: () => KO('hamgyeong').some(id => own(id)), run: async () => {
      const at = ['gyeongseong', 'gilju', 'hoeryong', 'hamheung'].find(id => own(id, 'joseon')) || ['gyeongseong'];
      let a = [];
      if (typeof at === 'string') a = spawn(['jmb'], at, 2500);
      else {
        // 함경도가 모두 넘어갔으면 경성을 되찾으며 일어난다
        const c = S().cities.gyeongseong;
        if (c.t < 4000) { const g = Game.gensIn('gyeongseong'); for (const x of g) S().gens[x].city = Game.nearestOwn('japan', 'gyeongseong'); Object.assign(c, { o: 'joseon', t: 3000, tr: 50, mo: 80, order: 70 }); a = spawn(['jmb'], 'gyeongseong', 0); }
      }
      S().uib.hamgyeong = Math.min(100, S().uib.hamgyeong + 15);
      if (!a.length) return;
      await UI.event({ seal: '北關', gen: 'jmb', title: '정문부의 북관 의병', date: '1592년 9월',
        body: `<p>북평사 정문부가 함경도 경성에서 의병을 일으켜 반란 세력을 처단하고 일본군을 몰아내기 시작했습니다. 이 싸움을 기린 비석이 북관대첩비입니다.</p><p>${where(a)}</p>`, hist: ['bukgwan'] });
    } },
    { id: 'ming2', at: [1592, 11], cond: () => (S().aid >= 3 || Game.nowYm() >= ym(1592, 12)), run: async () => {
      const north = jp(['pyongyang', 'hwangju', 'haeju', 'yeonan', 'gaeseong', 'paju', 'hanyang', 'anju']);
      const n = north || S().aid >= 2 ? 43000 : 20000;
      spawn(['liruson', 'liyebai', 'luoshang', 'songyc'], 'liaodong', 0);
      const L = S().cities.liaodong;
      L.t += n; L.tr = 75; L.mo = 80; L.f += n * 3;
      S().flags.mingIn = true;
      await UI.event({ seal: '天兵', gen: 'liruson', title: '이여송의 대군이 압록강을 건너다', date: `${S().y}년 ${S().m}월`,
        body: `<p>명의 만력제는 마침내 대군을 보내기로 했습니다. 제독 이여송이 ${n.toLocaleString()}명의 군사와 불랑기포·호준포 같은 화포를 이끌고 압록강을 건넜습니다.${S().aid >= 3 ? ' (조선 사신들의 거듭된 요청으로 한 달 일찍 왔습니다)' : ''}</p><p class="ev-tip">명군은 화포로 성벽을 잘 부숩니다. 명군과 함께 공격하면 큰 성도 되찾을 수 있습니다.</p>`, hist: ['e18'] });
    } },
    // ───── 1593: 강화 협상
    { id: 'truce', at: [1593, 4], cond: () => !own('pyongyang') || Game.nowYm() >= ym(1593, 6), run: async () => {
      const v = await UI.event({ seal: '講和', gen: 'simyugyeong', title: '명과 일본이 강화 협상을 시작하다', date: `${S().y}년 ${S().m}월`,
        body: `<p>평양을 잃고 군량이 바닥난 일본군과, 벽제관에서 꺾인 명군은 더 싸우기를 꺼렸습니다. 명의 심유경과 일본의 고니시 유키나가가 협상을 벌여, 일본군은 남해안으로 물러나기로 했습니다.</p>
          <p>조선 조정은 "원수와 화친할 수 없다"며 반대했지만 명은 듣지 않았습니다.</p>`,
        choices: [
          { v: 'accept', label: '협상을 받아들인다', note: '실제 역사. 일본군이 남해안 왜성으로 물러나고, 전쟁은 4년 가까이 멈춥니다. 그동안 개혁으로 나라를 다시 세우십시오. (턴이 석 달씩 흐릅니다)' },
          { v: 'refuse', label: '홀로라도 싸운다', note: '명군은 싸움을 멈추고 돌아갑니다. 조선은 남해안의 일본군과 계속 싸웁니다. (재정 -300)' },
        ], hist: ['e21', 'e23'] });
      S().flags.truce = true;
      if (v === 'refuse') { S().flags.truceBreak = true; S().gold.joseon = Math.max(0, S().gold.joseon - 300); }
      // 일본군이 남해안으로 물러난다
      for (const id of Object.keys(S().cities)) {
        const c = S().cities[id];
        if (c.o !== 'japan' || C[id].foreign || AI.TRUCE_KEEP.includes(id)) continue;
        const dest = AI.TRUCE_KEEP.find(k => own(k)) || 'tsushima';
        S().cities[dest].t += Math.round(c.t * 0.85);
        for (const g of Game.gensIn(id)) S().gens[g].city = dest;
        AI.abandon(id, 'japan');
      }
      for (const id of AI.TRUCE_KEEP) if (own(id)) { const c = S().cities[id]; c.castle = 'wae'; c.wall = Math.max(c.wall, 70); }
      // 일본군 대부분은 본국으로 돌아가고 남해안에 4만여 명이 남는다
      const kept = AI.TRUCE_KEEP.filter(k => own(k));
      const total = kept.reduce((t, k) => t + S().cities[k].t, 0);
      if (total > 45000) for (const k of kept) S().cities[k].t = Math.round(S().cities[k].t * 45000 / total);
      for (const [g, s] of Object.entries(S().gens)) if (s.st === 'captive' && GD.GENS[g].fac === 'joseon') Object.assign(s, { st: 'on', city: S().capital, held: null });
      for (const f of S().fleets.filter(f => f.o === 'japan')) Game.retreatFleet(f);
    } },
    { id: 'jinju2', at: [1593, 6], cond: () => S().flags.truce && own('jinju', 'joseon'), when: 'ai', run: async () => {
      for (const g of ['kimcheonil', 'hwangjin', 'choigh']) if (on(g) && !S().gens[g].fleet) moveGen(g, 'jinju');
      S().cities.jinju.t += 2000;
      await UI.event({ seal: '晉州', title: '일본군이 진주성으로 몰려오다', date: '1593년 6월',
        body: `<p>도요토미 히데요시는 지난해 진주성에서 당한 패배를 갚으라며 9만이 넘는 대군을 진주로 보냈습니다. 강화 협상 중이었지만 일본군은 진주성을 에워쌌습니다.</p><p>김천일·황진·최경회 등이 진주성에 들어가 함께 지키기로 했습니다.</p>`, hist: ['e22'] });
      const gens = ['ukita', 'kato', 'konishi', 'kuroda', 'nabeshima'].filter(on);
      const keep = AI.TRUCE_KEEP.filter(k => own(k));
      const from = keep.includes('gimhae') ? 'gimhae' : keep[0];
      if (!from) return;
      // 남해안 왜성의 군사를 모아 진주로
      let force = 0;
      for (const k of keep) { const c = S().cities[k]; const take = Math.round(c.t * 0.65); c.t -= take; force += take; }
      S().cities[from].t += force;
      for (const g of gens) if (!S().gens[g].fleet) S().gens[g].city = from;
      await Game.assault('japan', from, gens, force, 'jinju');
      if (own('jinju')) {
        const c = S().cities.jinju;
        S().cities[from].t += Math.round(c.t * 0.9);
        for (const g of Game.gensIn('jinju')) S().gens[g].city = from;
        AI.abandon('jinju', 'japan');
        c.wall = 20;
        await UI.event({ seal: '晉州', title: '진주성이 무너지다', date: '1593년 6월 29일',
          body: '<p>아흐레 동안의 싸움 끝에 진주성이 무너졌습니다. 일본군은 성안의 군민 수만 명을 죽이고 성을 허문 뒤 남해안으로 물러났습니다. 관기 논개는 촉석루 아래 의암에서 일본 장수를 껴안고 남강에 몸을 던졌다고 전합니다.</p>', hist: ['e22'] });
      }
    } },
    { id: 'hullyeon', at: [1593, 8], cond: () => !S().reforms.hullyeon, run: async () => {
      const v = await UI.event({ seal: '訓鍊', gen: 'ryu', title: '훈련도감을 세우자', date: `${S().y}년 ${S().m}월`,
        body: `<p>류성룡이 명군의 절강 병법(척계광의 『기효신서』)을 본떠, 조총을 쏘는 포수·활을 쏘는 사수·창칼을 쓰는 살수의 <b>삼수병</b>을 기르는 훈련도감을 세우자고 아뢰었습니다.</p>`,
        choices: [{ v: 'yes', label: '훈련도감을 세운다 (재정 800)', note: '조선군도 조총병을 편성할 수 있고, 훈련 한도가 오릅니다.' }, { v: 'no', label: '나중에 (국정 메뉴에서 시행)', note: '' }] });
      if (v === 'yes') { const r = Game.reform('hullyeon'); if (!r.ok) UI.toast(r.msg); }
    } },
    { id: 'ming_home', at: [1593, 9], cond: () => Object.keys(S().cities).some(id => own(id, 'ming') && !C[id].foreign), run: async () => {
      for (const id of Object.keys(S().cities)) {
        const c = S().cities[id];
        if (c.o !== 'ming' || C[id].foreign) continue;
        S().cities.liaodong.t += Math.round(c.t * 0.5);
        for (const g of Game.gensIn(id)) S().gens[g].city = 'liaodong';
        Object.assign(c, { o: 'joseon', t: Math.round(c.t * 0.1) + 1000, tr: 45, mo: 60 });
      }
      await UI.event({ seal: '撤兵', title: '명군 대부분이 돌아가다', date: `${S().y}년 ${S().m}월`,
        body: '<p>강화 협상이 이어지자 명군 대부분이 본국으로 돌아갔습니다. 명군이 지키던 성은 조선이 다시 맡습니다.</p>' });
    } },
    { id: 'return', at: [1593, 10], cond: () => S().capital !== 'hanyang' && own('hanyang', 'joseon'), run: async () => {
      Game.moveCapital('hanyang');
      for (const id of Game.citiesOf('joseon')) S().cities[id].order = Math.min(100, S().cities[id].order + 6);
      await UI.event({ seal: '還都', gen: 'seonjo', title: '임금이 한양으로 돌아오다', date: `${S().y}년 ${S().m}월`,
        body: '<p>임금이 한양으로 돌아왔습니다. 궁궐이 모두 불타 월산대군의 옛집(정릉동 행궁, 지금의 덕수궁)을 임시 궁궐로 삼았습니다. 백성들이 안도합니다. (민심 +6)</p>' });
    } },
    { id: 'reforms94', at: [1594, 1], cond: () => S().flags.truce, run: async () => {
      await UI.event({ seal: '更張', gen: 'ryu', title: '나라를 다시 세우다', date: `${S().y}년 ${S().m}월`,
        body: '<p>전쟁이 멈춘 사이 조정은 군사 제도를 고치기 시작했습니다. 양반부터 노비까지 묶어 지방군을 다시 짜는 <b>속오군</b>, 군사가 농사를 지어 군량을 마련하는 <b>둔전</b>을 시행할 수 있습니다.</p><p class="ev-tip">조정이 있는 고을을 눌러 <b>국정 → 개혁</b>에서 시행하십시오. 일본군은 반드시 다시 옵니다.</p>' });
    } },
    { id: 'kimdr', scen: 's1592', at: [1593, 12], run: async () => {
      const a = spawn(['kimdr'], 'gwangju', 1500);
      if (a.length) await UI.event({ seal: '倡義', gen: 'kimdr', title: '익호장군 김덕령', date: `${S().y}년 ${S().m}월`, body: `<p>담양의 김덕령이 의병을 일으켰습니다. 힘이 장사여서 "날랜 호랑이 같은 장군(익호장군)"이라 불렸습니다.</p><p>${where(a)}</p>` });
    } },
    { id: 'imonghak', at: [1596, 7], run: async () => {
      const at = ['hongju', 'gongju', 'jiksan'].find(id => own(id, 'joseon'));
      if (at) { const c = S().cities[at]; c.t = Math.max(0, c.t - 1500); c.order = Math.max(5, c.order - 20); }
      const has = on('kimdr');
      const v = await UI.event({ seal: '亂', title: '이몽학의 난', date: '1596년 7월',
        body: `<p>충청도 홍산에서 이몽학이 "굶주린 백성을 구한다"며 난을 일으켰습니다. 난은 곧 진압되었지만${at ? ` ${C[at].name}의 민심이 크게 흔들렸습니다` : ''}.${has ? ' 붙잡힌 무리가 의병장 김덕령도 한편이었다고 거짓으로 끌어들였습니다.' : ''}</p>`,
        choices: has ? [{ v: 'arrest', label: '김덕령을 잡아 국문한다', note: '실제 역사. 김덕령은 혹독한 고문 끝에 옥중에서 죽었고, 의병장들이 몸을 사리게 되었습니다.' }, { v: 'trust', label: '김덕령의 결백을 믿는다', note: '조정의 의심을 누르느라 재정이 듭니다. (재정 -200)' }] : null, hist: ['imonghak'] });
      if (v === 'arrest') { S().gens.kimdr.st = 'dead'; S().gens.kimdr.city = null; for (const k of Object.keys(S().uib)) S().uib[k] *= 0.7; }
      if (v === 'trust') S().gold.joseon = Math.max(0, S().gold.joseon - 200);
    } },
    { id: 'talks_fail', at: [1596, 10], cond: () => S().flags.truce, run: async () => {
      await UI.event({ seal: '決裂', gen: 'hideyoshi', title: '강화 협상이 깨지다', date: `${S().y}년 ${S().m}월`,
        body: '<p>명은 도요토미를 "일본 국왕"으로 책봉하는 사신을 보냈습니다. 그러나 명의 황녀를 후비로 보내고 조선 남쪽 4도를 넘기라는 자신의 요구가 하나도 받아들여지지 않았음을 안 도요토미는 크게 노하여 다시 군사를 일으키기로 했습니다.</p><p class="ev-tip">1597년 1월부터 전쟁이 다시 시작됩니다. 남해안 고을의 성벽을 보강하고, 수군과 군사를 늘려 두십시오.</p>', hist: ['e23'] });
    } },
    // ───── 1597: 정유재란
    { id: 'jeongyu', scen: 's1592', at: [1597, 1], run: async () => {
      S().flags.truce = false; S().flags.truceBreak = false;
      const T = S().cities.tsushima;
      T.t += 15000; T.f += 40000;
      for (const g of ['kato', 'konishi', 'so', 'nabeshima']) if (on(g) && !S().gens[g].fleet) S().gens[g].city = 'tsushima';
      S().waves.push({ at: [1597, 7], to: 'tsushima', t: 100000, g: ['ukita', 'hideaki', 'morih', 'kuroda', 'shimazu', 'hachisuka', 'tachibana', 'todo', 'wakizaka', 'katoyoshiaki', 'michifusa', 'asano', 'kikkawa'], s: { atake: 20, seki: 200 }, f: 80000, done: false });
      for (const g of ['ukita', 'morih', 'kuroda', 'shimazu', 'hachisuka', 'tachibana', 'todo', 'wakizaka', 'katoyoshiaki', 'kikkawa', 'takakage', 'fukushima', 'terumoto', 'moriy', 'kuki', 'ishida', 'ekei']) {
        if (on(g) && S().gens[g].city && !C[S().gens[g].city].foreign) S().gens[g].city = 'tsushima';
        if (on(g) && ['takakage', 'fukushima', 'terumoto', 'moriy', 'kuki', 'ishida', 'ekei'].includes(g)) S().gens[g].st = 'off';
      }
      await UI.event({ seal: '丁酉', title: '정유재란', date: '1597년 1월',
        body: '<p>가토 기요마사와 고니시 유키나가가 다시 바다를 건너오고 있습니다. 7월에는 14만 대군이 뒤따를 것입니다. 이번 목표는 지난 전쟁에서 차지하지 못한 전라도입니다.</p>', hist: ['e24'] });
    } },
    { id: 'arrest_yi', at: [1597, 2], cond: () => on('yisunsin') && on('wongyun'), run: async () => {
      const v = await UI.event({ seal: '拿鞫', gen: 'yisunsin', title: '이순신을 잡아들이라는 명', date: '1597년 2월',
        body: '<p>일본의 이중간첩 요시라가 "가토 기요마사가 바다를 건너올 날짜"를 흘렸습니다. 이순신은 적의 꾀라 보고 함대를 움직이지 않았고, 가토는 이미 상륙한 뒤였습니다. 조정에서는 명령을 어겼다며 이순신을 벌하자는 목소리가 높습니다.</p>',
        choices: [
          { v: 'arrest', label: '이순신을 파직하고 원균에게 수군을 맡긴다', note: '실제 역사. 이순신은 옥에 갇혔다가 풀려나 권율 밑에서 백의종군했습니다.' },
          { v: 'trust', label: '이순신을 믿는다', note: '실제와 다른 길입니다.' },
        ], hist: ['e24'] });
      if (v === 'arrest') {
        const g = S().gens.yisunsin;
        const place = g.fleet ? null : g.city;
        if (g.fleet) { const f = S().fleets.find(x => x.id === g.fleet); f.g = f.g.filter(x => x !== 'yisunsin'); if (on('wongyun') && !f.g.includes('wongyun')) { f.g.unshift('wongyun'); S().gens.wongyun.fleet = f.id; S().gens.wongyun.city = null; } }
        else if (on('wongyun')) moveGen('wongyun', place);
        Object.assign(g, { st: 'out', city: null, fleet: null });
        S().flags.wonCmd = true;
      }
    } },
    { id: 'namwon_ming', at: [1597, 5], run: async () => {
      spawn(['yangwon'], 'liaodong', 0);
      if (own('namwon', 'joseon')) {
        const c = S().cities.namwon;
        Object.assign(c, { o: 'ming', t: c.t + 3000, tr: 70, mo: 70 });
        moveGen('yangwon', 'namwon');
      } else S().cities.liaodong.t += 3000;
      S().flags.mingIn = true;
      await UI.event({ seal: '天兵', gen: 'yangwon', title: '명군이 다시 오다', date: '1597년 5월',
        body: '<p>명의 부총병 양원이 3천 명을 이끌고 남원성에 들어가 지키기로 했습니다. 남원은 명군이 맡습니다. 7월에는 제독 마귀와 경리 양호가 대군을 이끌고 올 것입니다.</p>', hist: ['e26'] });
    } },
    { id: 'ming4', at: [1597, 7], run: async () => {
      spawn(['magui', 'yanghao', 'haisheng'], 'liaodong', 0);
      const L = S().cities.liaodong; L.t += 30000; L.tr = 75; L.mo = 75; L.f += 60000;
      await UI.event({ seal: '天兵', gen: 'magui', title: '마귀·양호의 명군', date: '1597년 7월', body: '<p>제독 마귀와 경리 양호가 3만 명을 이끌고 압록강을 건넜습니다.</p>' });
    } },
    { id: 'chilcheon', at: [1597, 7], when: 'ai', cond: () => S().flags.wonCmd && on('wongyun') && !S().flags.chilDone, run: async () => {
      S().flags.chilDone = true;
      // 원균이 있는 함대 또는 포구의 배를 모두 이끌고 나간다
      let fl = S().fleets.find(f => f.o === 'joseon' && f.g.includes('wongyun'));
      if (!fl) {
        const port = S().gens.wongyun.city;
        if (!port || !C[port].port) return;
        const ships = Object.assign({}, S().cities[port].ships);
        if (Game.totalShips(ships) < 10) return;
        const gens = Game.gensIn(port).filter(g => GD.GENS[g].skills.includes('navy'));
        const z = C[port].port;
        for (const [k, n] of Object.entries(ships)) S().cities[port].ships[k] = 0;
        fl = { id: S().fid++, o: 'joseon', zone: z, g: gens, s: ships, tr: S().cities[port].tr, mo: 50, moved: true };
        S().fleets.push(fl);
        for (const g of gens) Object.assign(S().gens[g], { city: null, fleet: fl.id });
      }
      await UI.event({ seal: '漆川', gen: 'wongyun', title: '원균에게 출전을 재촉하다', date: '1597년 7월',
        body: '<p>조정과 도원수 권율은 부산 앞바다로 나아가 일본 수군을 치라고 원균을 거듭 재촉했습니다. 지친 조선 수군은 거센 풍랑에 시달리다 거제 칠천량에 닻을 내렸고, 그 밤 일본 수군이 사방에서 들이닥쳤습니다.</p><p class="ev-tip">함대는 지치고 사기가 낮습니다. 살아남는 것이 목표입니다.</p>', hist: ['e25'] });
      fl.zone = 's_geoje'; fl.mo = 25; S().flags.ambush = 'D';
      const T = S().cities.tsushima;
      const js = { atake: Math.min(12, T.ships.atake || 0), seki: Math.min(150, T.ships.seki || 0) };
      js.seki = Math.max(js.seki, 120); js.atake = Math.max(js.atake, 10);
      T.ships.atake = Math.max(0, (T.ships.atake || 0) - js.atake); T.ships.seki = Math.max(0, (T.ships.seki || 0) - js.seki);
      const jg = ['todo', 'wakizaka', 'katoyoshiaki', 'michifusa'].filter(g => on(g) && !S().gens[g].fleet);
      const jf = { id: S().fid++, o: 'japan', zone: 's_geoje', g: jg, s: js, tr: 85, mo: 90, moved: true };
      S().fleets.push(jf);
      for (const g of jg) Object.assign(S().gens[g], { city: null, fleet: jf.id });
      const before = Game.totalShips(fl.s);
      const res = await Game.seaBattleNow(jf, [fl]);
      if (res && res.win === 'att') {
        for (const g of ['wongyun', 'yiukki']) if (S().gens[g].st === 'on') { S().gens[g].st = 'dead'; S().gens[g].city = null; S().gens[g].fleet = null; }
        if (S().gens.baeseol.st === 'on' || S().gens.baeseol.st === 'off') Object.assign(S().gens.baeseol, { st: 'on', city: 'haenam', fleet: null });
        const port = own('haenam', 'joseon') ? 'haenam' : Game.citiesOf('joseon').find(id => C[id].port) || 'haenam';
        S().cities[port].ships.panok = Math.max(12, S().cities[port].ships.panok || 0);
        for (const f of S().fleets.filter(f => f.o === 'joseon')) { for (const g of f.g) Object.assign(S().gens[g], { fleet: null, city: port }); }
        S().fleets = S().fleets.filter(f => f.o !== 'joseon');
        await UI.event({ seal: '漆川', title: '칠천량에서 조선 수군이 무너지다', date: '1597년 7월 16일',
          body: `<p>원균과 전라우수사 이억기가 전사하고, 조선 수군은 거의 사라졌습니다. 경상우수사 배설만이 배 12척을 이끌고 빠져나와 ${C[port].name}으로 물러났습니다. 남해 바다가 일본 수군에게 열렸습니다.</p>`, hist: ['e25'] });
      } else if (res) {
        await UI.event({ seal: '漆川', title: '칠천량의 위기를 넘기다', date: '1597년 7월', body: `<p>조선 수군이 기습을 견뎌 냈습니다. 실제 역사에서는 이 싸움에서 조선 수군이 거의 전멸했습니다. (출전 함선 ${before}척)</p>`, hist: ['e25'] });
      }
    } },
    { id: 'yi_back', at: [1597, 8], cond: () => S().gens.yisunsin.st === 'out', run: async () => {
      const port = ['haenam', 'yeosu', 'naju'].find(id => own(id, 'joseon')) || Game.citiesOf('joseon').find(id => C[id].port);
      if (!port) return;
      Object.assign(S().gens.yisunsin, { st: 'on', city: port, fleet: null });
      const c = S().cities[port];
      c.ships.panok = Math.max(13, c.ships.panok || 0);
      c.t = Math.max(c.t, 1800);
      S().flags.wonCmd = false;
      await UI.event({ seal: '統制', gen: 'yisunsin', title: '이순신, 삼도수군통제사로 돌아오다', date: '1597년 8월 3일',
        body: `<p>칠천량의 패전 소식을 들은 조정은 백의종군하던 이순신을 다시 삼도수군통제사로 삼았습니다. 수군을 없애고 육군에 합치라는 명에 이순신은 이렇게 아뢰었습니다.</p>
          <blockquote>今臣戰船 尙有十二 — 지금 신에게는 아직 전선 열두 척이 있습니다.</blockquote>
          <p>${C[port].name}에 판옥선 ${c.ships.panok}척이 남아 있습니다. 일본 수군은 서해로 나아가려 할 것입니다. 진도와 해남 사이의 좁은 물목 <b>명량(울돌목)</b>은 물살이 빠르고 때마다 방향이 바뀝니다.</p>`, hist: ['e28'] });
    } },
    { id: 'wae_castles', at: [1597, 12], run: async () => {
      const kept = AI.HOLD_KEEP.filter(id => own(id));
      for (const id of kept) { const c = S().cities[id]; c.castle = 'wae'; c.wall = Math.max(c.wall, 75); }
      if (kept.length) await UI.event({ seal: '倭城', title: '일본군이 남해안에 왜성을 쌓다', date: `${S().y}년 ${S().m}월`,
        body: `<p>북상이 막힌 일본군은 남해안으로 물러나 돌로 높게 쌓은 왜성에 들어앉았습니다. (${kept.map(id => C[id].name).join('·')}) 왜성은 성벽이 여러 겹이라 쉽게 무너지지 않습니다.</p>`, hist: ['e29'] });
    } },
    { id: 'ming5', at: [1598, 7], run: async () => {
      spawn(['dongyiyuan', 'liuting'], 'liaodong', 0);
      const L = S().cities.liaodong; L.t += 40000; L.f += 80000;
      const navy = ['chenlin', 'dengzilong'].filter(g => S().gens[g].st === 'off');
      if (navy.length) {
        const z = S().fleets.find(f => f.o === 'joseon')?.zone || C[(['haenam', 'yeosu', 'naju'].find(id => own(id, 'joseon')) || 'haenam')].port;
        const f = { id: S().fid++, o: 'ming', zone: z, g: navy, s: { mship: 40 }, tr: 70, mo: 75, moved: true };
        S().fleets.push(f);
        for (const g of navy) Object.assign(S().gens[g], { st: 'on', fleet: f.id, city: null });
      }
      await UI.event({ seal: '四路', gen: 'chenlin', title: '사로병진을 앞두고', date: '1598년 7월',
        body: '<p>명은 동일원·유정이 이끄는 4만 대군을 더 보냈고, 수군도독 진린이 전선을 이끌고 와 조선 수군과 합류했습니다. 조·명 연합군은 울산·사천·순천의 왜성을 한꺼번에 치는 "사로병진"을 준비합니다.</p>', hist: ['e31'] });
    } },
    { id: 'hideyoshi', at: [1598, 8], run: async () => {
      S().flags.hideyoshiDead = true;
      await UI.event({ seal: '薨', gen: 'hideyoshi', title: '도요토미 히데요시가 죽다', date: '1598년 8월 18일',
        body: '<p>도요토미 히데요시가 후시미 성에서 병으로 죽었습니다. 유언에 따라 일본군은 조선에서 물러나기로 했지만, 그 죽음은 한동안 비밀에 부쳐졌습니다.</p><p class="ev-tip">일본군은 11월까지 남해안 왜성에 모였다가 바다를 건너 돌아갑니다. 그 전에 얼마나 많은 땅을 되찾느냐가 전쟁의 결과를 가릅니다.</p>', hist: ['e30'] });
    } },
    { id: 'noryang', at: [1598, 11], cond: () => jp(['suncheon', 'sacheon', 'ungcheon', 'geoje', 'busan']), run: async () => {
      const mine = S().fleets.filter(f => f.o === 'joseon').concat([]);
      const ports = Game.citiesOf('joseon').filter(id => C[id].port && Game.totalShips(S().cities[id].ships) >= 8);
      const near = (z) => { const r = Game.seaReach(z, 'joseon', 3); return r.dist.s_namhae !== undefined || z === 's_namhae'; };
      const cand = mine.filter(f => near(f.zone)).concat(ports.filter(id => near(C[id].port)).map(id => ({ port: id })));
      const jg = ['shimazu', 'tachibana'].filter(g => on(g) && !S().gens[g].fleet);
      const jf = { id: S().fid++, o: 'japan', zone: 's_namhae', g: jg, s: { atake: 10, seki: 200 }, tr: 80, mo: 70, moved: true };
      if (!cand.length) return;
      const v = await UI.event({ seal: '露梁', gen: 'yisunsin', title: '노량으로 몰려오는 일본 수군', date: '1598년 11월 18일',
        body: '<p>순천 왜교성에 갇힌 고니시 유키나가를 구하려고 사천의 시마즈 요시히로가 5백여 척을 이끌고 노량 물길로 다가옵니다. 명의 진린은 고니시에게 뇌물을 받고 길을 열어 주려 했지만, 이순신은 "원수를 그냥 돌려보낼 수 없다"며 맞섰습니다.</p>',
        choices: [{ v: 'fight', label: '노량에서 친다', note: '실제 역사의 선택' }, { v: 'let', label: '돌아가게 둔다', note: '일본군은 피해 없이 물러갑니다.' }], hist: ['e32'] });
      if (v !== 'fight') return;
      S().fleets.push(jf);
      for (const g of jg) Object.assign(S().gens[g], { city: null, fleet: jf.id });
      let fl = cand[0];
      if (fl.port) {
        const ships = Object.assign({}, S().cities[fl.port].ships);
        const gens = Game.gensIn(fl.port).filter(g => GD.GENS[g].skills.includes('navy') || g === 'yisunsin');
        const r = await Game.sail('joseon', fl.port, gens, ships, 's_namhae', {});
        fl = null;
        if (!r || !r.ok) return;
      } else await Game.moveFleet(fl, 's_namhae', {});
      const fought = S().stats.lastSea && S().stats.lastSea.gens.includes('yisunsin');
      if (fought && S().gens.yisunsin.st === 'on') {
        Object.assign(S().gens.yisunsin, { st: 'dead', city: null, fleet: null });
        for (const f of S().fleets) f.g = f.g.filter(g => g !== 'yisunsin');
        await UI.event({ seal: '戰方急', gen: 'yisunsin', title: '이순신, 노량에서 지다', date: '1598년 11월 19일',
          body: '<p>새벽까지 이어진 싸움에서 조선과 명의 수군은 일본 배 2백여 척을 깨뜨렸습니다. 달아나는 적을 쫓던 이순신은 날아온 탄환에 맞아 쓰러졌습니다.</p><blockquote>戰方急 愼勿言我死 — 싸움이 한창 급하니 내가 죽었다는 말을 하지 말라.</blockquote><p>조카 이완은 숨을 거둔 이순신을 대신해 북을 울리며 싸움을 이끌었습니다. 7년 전쟁의 마지막 큰 싸움이었습니다.</p>', hist: ['e32'] });
      }
    } },
  ];
  const KO = (dk) => Game.KOREA.filter(id => C[id].do === dk);

  async function check(when) {
    const s = S();
    for (const e of EV) {
      if (s.done[e.id]) continue;
      if (e.scen && e.scen !== s.scen) continue;
      const w = e.when || 'start';
      if (w !== when) continue;
      if (e.at && Game.nowYm() < ym(...e.at)) continue;
      if (e.at && ym(...e.at) < ym(...GD.SCEN[s.scen].start)) continue;
      if (e.cond && !e.cond()) continue;
      s.done[e.id] = true;
      await e.run();
      UI.refresh();
      if (Game.checkEnd().over) return;
    }
  }
  return { check, EV };
})();

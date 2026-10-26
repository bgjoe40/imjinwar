// 칠년전쟁 — 게임 데이터 (세력·도시·길·바다·장수·시나리오)
// 장수 능력치와 도시 수치는 게임을 위한 가상의 값이며 역사적 평가가 아니다.

const GD = {};

GD.FAC = {
  joseon: { name: '조선', color: '#3f6fd8', soft: '#8fb0ee', seal: '朝' },
  japan:  { name: '일본', color: '#cf4436', soft: '#ee9a90', seal: '倭' },
  ming:   { name: '명',   color: '#d4a421', soft: '#f0d488', seal: '明' },
};

GD.DO = {
  gyeonggi: '경기도', gangwon: '강원도', chungcheong: '충청도', jeolla: '전라도',
  gyeongsang: '경상도', hwanghae: '황해도', pyeongan: '평안도', hamgyeong: '함경도',
};

// ── 도시
// size 1~3 규모, castle: eup 읍성 / san 산성 / wae 왜성, wall 성벽, farm 농업, trade 상업, pop 인구(만 명)
// 전장 지형: river·sea = 강·바다가 있는 방향(N/E/S/W), mount·forest·paddy = 산·숲·논의 많고 적음(0~3)
// port: 배를 댈 수 있는 바다 구역, hist: 이 고을에서 실제로 있었던 사건(../js/data-events.js 의 id)
const _c = (o) => Object.assign({ size: 1, castle: 'eup', wall: 35, farm: 40, trade: 25, pop: 5, mount: 1, forest: 1, paddy: 1 }, o);
GD.CITIES = {
  // 경상도
  busan:      _c({ name: '부산', sub: '부산진·동래', do: 'gyeongsang', ll: [35.14, 129.06], size: 2, wall: 45, farm: 35, trade: 45, pop: 6, sea: 'S', port: 's_busan', hist: ['e02', 'e03'] }),
  gimhae:     _c({ name: '김해', do: 'gyeongsang', ll: [35.235, 128.88], size: 2, wall: 40, farm: 60, trade: 35, pop: 7, river: 'E', paddy: 2, port: 's_busan' }),
  ungcheon:   _c({ name: '웅천', sub: '안골포', do: 'gyeongsang', ll: [35.10, 128.73], wall: 30, farm: 25, trade: 20, pop: 3, sea: 'S', mount: 2, port: 's_geoje', hist: ['angolpo'] }),
  geoje:      _c({ name: '거제', sub: '경상우수영', do: 'gyeongsang', ll: [34.88, 128.62], wall: 30, farm: 25, trade: 15, pop: 3, sea: 'W', mount: 2, port: 's_geoje', hist: ['e08'] }),
  miryang:    _c({ name: '밀양', do: 'gyeongsang', ll: [35.49, 128.75], wall: 35, farm: 55, trade: 30, pop: 6, river: 'S', paddy: 2 }),
  daegu:      _c({ name: '대구', do: 'gyeongsang', ll: [35.87, 128.60], size: 2, wall: 40, farm: 60, trade: 45, pop: 9, river: 'W', paddy: 2 }),
  gyeongju:   _c({ name: '경주', do: 'gyeongsang', ll: [35.84, 129.21], size: 2, wall: 50, farm: 55, trade: 40, pop: 8, mount: 2, hist: ['gyeongju'] }),
  ulsan:      _c({ name: '울산', sub: '좌병영·서생포', do: 'gyeongsang', ll: [35.55, 129.32], wall: 40, farm: 40, trade: 30, pop: 5, sea: 'E', port: 's_busan', hist: ['e29', 'ulsan2'] }),
  sangju:     _c({ name: '상주', sub: '경상감영', do: 'gyeongsang', ll: [36.41, 128.16], size: 2, wall: 40, farm: 65, trade: 40, pop: 9, river: 'E', paddy: 2, hist: ['e05'] }),
  andong:     _c({ name: '안동', do: 'gyeongsang', ll: [36.568, 128.729], size: 2, wall: 40, farm: 50, trade: 35, pop: 8, river: 'S', mount: 2, forest: 2 }),
  seongju:    _c({ name: '성주', do: 'gyeongsang', ll: [35.919, 128.283], wall: 35, farm: 55, trade: 30, pop: 6, mount: 2 }),
  uiryeong:   _c({ name: '의령', sub: '정암진', do: 'gyeongsang', ll: [35.32, 128.26], wall: 25, farm: 40, trade: 20, pop: 4, river: 'S', mount: 2, forest: 2, hist: ['e04', 'jeongam'] }),
  jinju:      _c({ name: '진주', sub: '우병영', do: 'gyeongsang', ll: [35.19, 128.08], size: 3, wall: 65, farm: 60, trade: 40, pop: 9, river: 'S', hist: ['e17', 'e22'] }),
  sacheon:    _c({ name: '사천', do: 'gyeongsang', ll: [35.03, 128.07], wall: 30, farm: 35, trade: 25, pop: 4, sea: 'S', port: 's_namhae', hist: ['e09', 'e31'] }),
  hamyang:    _c({ name: '함양', sub: '황석산성', do: 'gyeongsang', ll: [35.52, 127.725], castle: 'san', wall: 55, farm: 35, trade: 20, pop: 4, mount: 3, forest: 2, paddy: 0, hist: ['hwangseok'] }),
  // 전라도
  jeonju:     _c({ name: '전주', sub: '전라감영', do: 'jeolla', ll: [35.82, 127.15], size: 3, wall: 55, farm: 85, trade: 55, pop: 12, paddy: 2 }),
  namwon:     _c({ name: '남원', do: 'jeolla', ll: [35.41, 127.39], size: 2, wall: 50, farm: 65, trade: 35, pop: 8, river: 'S', mount: 2, hist: ['e26'] }),
  gwangju:    _c({ name: '광주', sub: '담양', do: 'jeolla', ll: [35.16, 126.88], size: 2, wall: 40, farm: 75, trade: 40, pop: 10, paddy: 2 }),
  naju:       _c({ name: '나주', do: 'jeolla', ll: [35.02, 126.71], size: 2, wall: 40, farm: 80, trade: 40, pop: 10, river: 'S', paddy: 3, port: 's_jindo' }),
  suncheon:   _c({ name: '순천', sub: '왜교', do: 'jeolla', ll: [34.95, 127.49], wall: 35, farm: 50, trade: 30, pop: 6, sea: 'S', port: 's_yeosu', hist: ['waegyo'] }),
  yeosu:      _c({ name: '여수', sub: '전라좌수영', do: 'jeolla', ll: [34.74, 127.74], wall: 45, farm: 25, trade: 25, pop: 3, sea: 'S', port: 's_yeosu' }),
  haenam:     _c({ name: '해남', sub: '전라우수영', do: 'jeolla', ll: [34.60, 126.42], wall: 40, farm: 45, trade: 20, pop: 5, sea: 'W', port: 's_jindo' }),
  geumsan:    _c({ name: '금산', sub: '웅치·이치', do: 'jeolla', ll: [36.11, 127.49], wall: 30, farm: 40, trade: 20, pop: 4, mount: 3, forest: 2, paddy: 0, hist: ['ungchi', 'e12'] }),
  // 충청도
  chungju:    _c({ name: '충주', sub: '탄금대', do: 'chungcheong', ll: [36.97, 127.93], size: 2, wall: 40, farm: 60, trade: 40, pop: 8, river: 'N', paddy: 3, hist: ['e06'] }),
  cheongju:   _c({ name: '청주', sub: '충청병영', do: 'chungcheong', ll: [36.64, 127.49], size: 2, wall: 45, farm: 65, trade: 40, pop: 9, paddy: 2, hist: ['e15'] }),
  gongju:     _c({ name: '공주', sub: '충청감영', do: 'chungcheong', ll: [36.46, 127.12], size: 2, castle: 'san', wall: 55, farm: 60, trade: 40, pop: 8, river: 'N', mount: 2 }),
  hongju:     _c({ name: '홍주', do: 'chungcheong', ll: [36.60, 126.66], wall: 35, farm: 55, trade: 30, pop: 6, sea: 'W', port: 's_seonam', hist: ['imonghak'] }),
  jiksan:     _c({ name: '직산', sub: '천안', do: 'chungcheong', ll: [36.88, 127.18], wall: 25, farm: 50, trade: 30, pop: 5, paddy: 2, hist: ['e27'] }),
  // 경기도
  hanyang:    _c({ name: '한양', sub: '도성', do: 'gyeonggi', ll: [37.57, 126.98], size: 3, wall: 70, farm: 50, trade: 90, pop: 15, river: 'S', mount: 2, port: 's_seobuk', hist: ['e07', 'e21'] }),
  suwon:      _c({ name: '수원', sub: '독성산성', do: 'gyeonggi', ll: [37.28, 127.01], castle: 'san', wall: 45, farm: 55, trade: 35, pop: 6, hist: ['yongin'] }),
  paju:       _c({ name: '파주', sub: '임진강·행주', do: 'gyeonggi', ll: [37.80, 126.80], wall: 30, farm: 45, trade: 25, pop: 5, river: 'N', hist: ['imjin', 'haeyu', 'e19', 'e20'] }),
  ganghwa:    _c({ name: '강화', do: 'gyeonggi', ll: [37.74, 126.49], wall: 50, farm: 40, trade: 30, pop: 4, sea: 'W', port: 's_seobuk', island: true }),
  gaeseong:   _c({ name: '개성', do: 'gyeonggi', ll: [37.97, 126.55], size: 2, wall: 50, farm: 50, trade: 65, pop: 8, mount: 2 }),
  // 강원도
  chuncheon:  _c({ name: '춘천', do: 'gangwon', ll: [37.88, 127.73], wall: 30, farm: 35, trade: 25, pop: 4, river: 'W', mount: 3, forest: 2 }),
  wonju:      _c({ name: '원주', sub: '강원감영', do: 'gangwon', ll: [37.34, 127.92], size: 2, castle: 'san', wall: 40, farm: 40, trade: 30, pop: 5, mount: 3, forest: 2 }),
  gangneung:  _c({ name: '강릉', do: 'gangwon', ll: [37.75, 128.90], wall: 35, farm: 35, trade: 30, pop: 5, sea: 'E', mount: 2, forest: 2 }),
  // 황해도
  haeju:      _c({ name: '해주', sub: '황해감영', do: 'hwanghae', ll: [38.04, 125.71], size: 2, wall: 45, farm: 55, trade: 35, pop: 7, sea: 'S', port: 's_seobuk' }),
  yeonan:     _c({ name: '연안', do: 'hwanghae', ll: [37.91, 126.16], wall: 45, farm: 50, trade: 25, pop: 5, sea: 'S', paddy: 2, port: 's_seobuk', hist: ['yeonan'] }),
  hwangju:    _c({ name: '황주', do: 'hwanghae', ll: [38.69, 125.76], wall: 35, farm: 50, trade: 30, pop: 5 }),
  // 평안도
  pyongyang:  _c({ name: '평양', sub: '평안감영', do: 'pyeongan', ll: [39.02, 125.75], size: 3, wall: 65, farm: 60, trade: 60, pop: 11, river: 'E', port: 's_seobuk', hist: ['e10', 'e13', 'e18'] }),
  anju:       _c({ name: '안주', do: 'pyeongan', ll: [39.62, 125.66], wall: 45, farm: 45, trade: 30, pop: 5, river: 'S' }),
  uiju:       _c({ name: '의주', do: 'pyeongan', ll: [40.20, 124.53], size: 2, wall: 50, farm: 40, trade: 45, pop: 5, river: 'W' }),
  // 함경도
  anbyeon:    _c({ name: '안변', sub: '철령', do: 'hamgyeong', ll: [39.03, 127.52], wall: 30, farm: 35, trade: 20, pop: 4, mount: 3, forest: 2, paddy: 0 }),
  hamheung:   _c({ name: '함흥', sub: '함경감영', do: 'hamgyeong', ll: [39.92, 127.54], size: 2, wall: 45, farm: 45, trade: 30, pop: 6, sea: 'E', mount: 2 }),
  gilju:      _c({ name: '길주', do: 'hamgyeong', ll: [40.96, 129.33], wall: 40, farm: 30, trade: 15, pop: 3, mount: 2, forest: 2, hist: ['bukgwan'] }),
  gyeongseong:_c({ name: '경성', sub: '북병영', do: 'hamgyeong', ll: [41.59, 129.61], wall: 45, farm: 25, trade: 15, pop: 3, sea: 'E', mount: 2 }),
  hoeryong:   _c({ name: '회령', do: 'hamgyeong', ll: [42.44, 129.75], wall: 40, farm: 25, trade: 20, pop: 3, river: 'N', mount: 2, hist: ['e14'] }),
  // 섬 수군 기지 (육로 연결 없음)
  hansan:     _c({ name: '한산도', sub: '통제영', do: 'gyeongsang', ll: [34.79, 128.47], wall: 30, farm: 5, trade: 5, pop: 1, sea: 'S', port: 's_geoje', island: true, naval: true, hist: ['e11'] }),
  // 나라 밖 본거지 (공격할 수 없음)
  liaodong:   _c({ name: '요동', sub: '遼東', ll: [40.95, 123.75], size: 3, wall: 90, farm: 0, trade: 0, pop: 0, foreign: 'ming' }),
  tsushima:   _c({ name: '쓰시마', sub: '對馬', ll: [34.40, 129.30], size: 2, wall: 60, farm: 0, trade: 0, pop: 0, foreign: 'japan', port: 's_daehan' }),
  nagoya:     _c({ name: '나고야', sub: '名護屋 본영', ll: [33.53, 129.87], size: 3, wall: 90, farm: 0, trade: 0, pop: 0, foreign: 'japan', port: 's_daehan' }),
};

// ── 육로 [도시, 도시, 행군 비용, 고개·나루 이름]
// sea: 일본군만 쓸 수 있는 바닷길(쓰시마에서 상륙)
GD.LINKS = [
  ['busan', 'gimhae', 1], ['busan', 'miryang', 1], ['busan', 'ulsan', 1], ['gimhae', 'miryang', 1], ['gimhae', 'ungcheon', 1],
  ['ungcheon', 'uiryeong', 1], ['ungcheon', 'sacheon', 2], ['geoje', 'ungcheon', 2, '견내량 나루'],
  ['miryang', 'daegu', 1], ['miryang', 'uiryeong', 1], ['daegu', 'gyeongju', 1], ['daegu', 'sangju', 1], ['daegu', 'seongju', 1],
  ['daegu', 'andong', 2], ['gyeongju', 'ulsan', 1], ['gyeongju', 'andong', 2], ['andong', 'chungju', 2, '죽령'],
  ['sangju', 'chungju', 2, '조령'], ['sangju', 'seongju', 1], ['seongju', 'uiryeong', 1], ['seongju', 'cheongju', 2, '추풍령'],
  ['seongju', 'geumsan', 2], ['seongju', 'hamyang', 2], ['uiryeong', 'jinju', 1], ['jinju', 'sacheon', 1], ['jinju', 'hamyang', 1],
  ['hamyang', 'namwon', 2, '팔량치'], ['sacheon', 'suncheon', 2, '섬진강'],
  ['jeonju', 'namwon', 1], ['jeonju', 'geumsan', 2, '웅치·이치'], ['jeonju', 'gwangju', 1], ['jeonju', 'gongju', 1],
  ['namwon', 'suncheon', 1], ['namwon', 'gwangju', 1], ['gwangju', 'naju', 1], ['naju', 'haenam', 1], ['gwangju', 'suncheon', 1],
  ['suncheon', 'yeosu', 1],
  ['chungju', 'cheongju', 1], ['chungju', 'hanyang', 1], ['chungju', 'wonju', 1], ['cheongju', 'jiksan', 1], ['cheongju', 'gongju', 1],
  ['cheongju', 'geumsan', 1], ['gongju', 'jiksan', 1], ['gongju', 'hongju', 1], ['jiksan', 'suwon', 1], ['hongju', 'jiksan', 1],
  ['hanyang', 'suwon', 1], ['hanyang', 'paju', 1], ['hanyang', 'ganghwa', 2, '통진 나루'], ['paju', 'gaeseong', 1, '임진나루'],
  ['hanyang', 'chuncheon', 1], ['hanyang', 'anbyeon', 2, '철령'],
  ['chuncheon', 'wonju', 1], ['chuncheon', 'gangneung', 2], ['wonju', 'gangneung', 2, '대관령'], ['chuncheon', 'anbyeon', 2], ['gangneung', 'anbyeon', 2],
  ['gaeseong', 'yeonan', 1], ['gaeseong', 'hwangju', 1], ['yeonan', 'haeju', 1], ['haeju', 'hwangju', 1], ['hwangju', 'pyongyang', 1],
  ['pyongyang', 'anju', 1], ['anju', 'uiju', 1], ['pyongyang', 'hamheung', 2],
  ['anbyeon', 'hamheung', 1], ['hamheung', 'gilju', 2, '마천령'], ['gilju', 'gyeongseong', 1], ['gyeongseong', 'hoeryong', 1],
  ['uiju', 'liaodong', 1, '압록강'],
  ['nagoya', 'tsushima', 1, '현해탄', 'sea'], ['tsushima', 'busan', 1, '대한해협', 'sea'], ['tsushima', 'gimhae', 1, '대한해협', 'sea'],
  ['tsushima', 'ulsan', 1, '대한해협', 'sea'],
];

// ── 바다 구역 (수군 이동·보급로)
// tmpl: 해전 전장 모양 (open 넓은 바다, islands 섬 많은 바다, strait 좁은 해협, channel 좁은 물길, harbor 포구)
GD.SEAS = {
  s_daehan: { name: '대한해협',   ll: [34.62, 129.62], adj: ['s_busan'], tmpl: 'open' },
  s_busan:  { name: '부산 앞바다', ll: [35.00, 129.20], adj: ['s_daehan', 's_geoje'], tmpl: 'harbor', hist: ['e16'] },
  s_geoje:  { name: '거제·견내량', ll: [34.72, 128.70], adj: ['s_busan', 's_namhae'], tmpl: 'islands', hist: ['e08', 'dangpo', 'danghang', 'e11', 'angolpo', 'e25', 'jangmun'] },
  s_namhae: { name: '남해·노량',   ll: [34.70, 128.08], adj: ['s_geoje', 's_yeosu'], tmpl: 'channel', hist: ['e09', 'e32'] },
  s_yeosu:  { name: '여수·광양만', ll: [34.50, 127.55], adj: ['s_namhae', 's_jindo'], tmpl: 'islands', hist: ['waegyo'] },
  s_jindo:  { name: '진도·명량',   ll: [34.33, 126.70], adj: ['s_yeosu', 's_seonam'], tmpl: 'strait', hist: ['e28', 'eoran'] },
  s_seonam: { name: '서해 남부',   ll: [35.95, 126.05], adj: ['s_jindo', 's_seobuk'], tmpl: 'open' },
  s_seobuk: { name: '서해 북부',   ll: [37.45, 125.85], adj: ['s_seonam'], tmpl: 'open' },
};
// 일본에서 서해로 가는 보급 뱃길 (이 구역들에 조선 수군이 있으면 끊긴다)
GD.SEA_CHAIN = ['s_busan', 's_geoje', 's_namhae', 's_yeosu', 's_jindo', 's_seonam', 's_seobuk'];

// ── 병종 (전술 전투)
// mp 이동력, rng 사거리, atk 근접 공격, ratk 원거리 공격, def 방어, per 한 척에 탄 군사(배)
GD.UNITS = {
  inf:    { name: '보병',     glyph: '步', mp: 4, rng: 1, atk: 1.0,  ratk: 0,    def: 1.0,  wallK: 0.25, codex: 'japansword' },
  spear:  { name: '장창병',   glyph: '槍', mp: 4, rng: 1, atk: 1.05, ratk: 0,    def: 1.1,  wallK: 0.25, antiCav: 1.6, codex: 'japansword' },
  cav:    { name: '기병',     glyph: '騎', mp: 6, rng: 1, atk: 1.35, ratk: 0,    def: 0.85, wallK: 0.1, codex: null },
  bow:    { name: '궁병',     glyph: '弓', mp: 4, rng: 3, atk: 0.6,  ratk: 0.8,  def: 0.8,  wallK: 0.1, codex: 'gakgung' },
  gun:    { name: '조총병',   glyph: '銃', mp: 4, rng: 2, atk: 0.7,  ratk: 1.25, def: 0.8,  wallK: 0.15, shock: 5, codex: 'jochong' },
  cannon: { name: '화포',     glyph: '砲', mp: 3, rng: 3, atk: 0.4,  ratk: 1.1,  def: 0.6,  wallK: 1.6, codex: 'chongtong' },
  uib:    { name: '의병',     glyph: '義', mp: 5, rng: 1, atk: 0.95, ratk: 0,    def: 0.9,  wallK: 0.2, rough: true, codex: 'ambush' },
  monk:   { name: '승병',     glyph: '僧', mp: 4, rng: 1, atk: 1.1,  ratk: 0,    def: 1.05, wallK: 0.25, steady: true, codex: null },
  // 배
  panok:  { name: '판옥선',   glyph: '板', sea: true, mp: 4, rng: 2, atk: 0.8,  ratk: 1.35, def: 1.3,  per: 160, codex: 'panokseon' },
  turtle: { name: '거북선',   glyph: '龜', sea: true, mp: 5, rng: 1, atk: 1.7,  ratk: 1.0,  def: 2.0,  per: 160, noBoard: true, codex: 'geobukseon' },
  atake:  { name: '아타케부네', glyph: '安', sea: true, mp: 3, rng: 2, atk: 1.3, ratk: 0.6,  def: 1.25, per: 150, board: 1.5, codex: 'atakebune' },
  seki:   { name: '세키부네', glyph: '關', sea: true, mp: 5, rng: 1, atk: 1.15, ratk: 0.45, def: 0.85, per: 60,  board: 1.4, codex: 'sekibune' },
  mship:  { name: '명 전선',  glyph: '明', sea: true, mp: 4, rng: 2, atk: 1.0,  ratk: 1.1,  def: 1.2,  per: 120, codex: 'mingship' },
};
// 세력별로 고를 수 있는 육군 병종 (조선 조총병은 훈련도감 개혁 뒤)
GD.FAC_UNITS = {
  joseon: ['inf', 'bow', 'cav', 'cannon', 'uib', 'monk'],
  japan:  ['gun', 'spear', 'inf', 'cav'],
  ming:   ['cav', 'inf', 'cannon', 'spear'],
};
GD.FAC_SHIPS = { joseon: ['panok', 'turtle'], japan: ['atake', 'seki'], ming: ['mship'] };

// ── 장수: [이름, 대표 한자, 세력, 통솔, 무력, 지력, 정치, 매력, 특기]
// 특기: navy 수군, turtle 거북선 건조, cav 기병, bow 궁술, gun 조총, cannon 화포, siege 수성, build 축성, admin 내정,
//       envoy 외교, uib 의병, monk 승병, trick 계략, charge 돌격, king 군주(전투에 나가지 않음)
// 인물 설명은 ../js/data-people.js 의 PEOPLE 을 쓰고, 그곳에 없는 장수만 bio 를 적는다.
GD.SKILLS = {
  navy: '수군', turtle: '거북선', cav: '기병', bow: '궁술', gun: '조총', cannon: '화포', siege: '수성', build: '축성',
  admin: '내정', envoy: '외교', uib: '의병', monk: '승병', trick: '계략', charge: '돌격', king: '군주',
};
const _g = (name, ch, fac, lea, war, int, pol, cha, skills = [], bio) => ({ name, ch, fac, lea, war, int, pol, cha, skills, bio });
GD.GENS = {
  // 조선 조정·관군
  seonjo:     _g('선조', '宣', 'joseon', 35, 20, 70, 62, 60, ['king']),
  gwanghae:   _g('광해군', '光', 'joseon', 58, 45, 76, 78, 86, ['admin']),
  ryu:        _g('류성룡', '柳', 'joseon', 62, 22, 95, 96, 82, ['admin', 'envoy', 'build']),
  yidh:       _g('이덕형', '李', 'joseon', 45, 25, 88, 86, 86, ['envoy']),
  yihb:       _g('이항복', '李', 'joseon', 52, 32, 86, 86, 84, ['envoy', 'admin']),
  ydsu:       _g('윤두수', '尹', 'joseon', 52, 32, 80, 84, 70, ['admin'], '좌의정. 선조의 피란길을 따르며 평양 수비를 맡았고, 전쟁 내내 조정의 군무를 도왔다.'),
  lww:        _g('이원익', '李', 'joseon', 55, 30, 86, 92, 88, ['admin'], '평안도 순찰사·도체찰사. 백성을 아끼는 청렴한 관리로 이름이 높았고, 전쟁 뒤 대동법 시행을 이끌었다.'),
  kmw:        _g('김명원', '金', 'joseon', 60, 50, 66, 70, 62, []),
  sinrip:     _g('신립', '申', 'joseon', 76, 92, 50, 44, 72, ['cav', 'charge']),
  yiil:       _g('이일', '李', 'joseon', 62, 74, 50, 40, 52, ['cav']),
  singak:     _g('신각', '申', 'joseon', 70, 74, 55, 45, 60, []),
  sinhal:     _g('신할', '申', 'joseon', 60, 74, 40, 36, 54, [], '신립의 동생. 1592년 5월 임진강 방어전에서 강을 건너 공격하다 일본군의 유인에 걸려 전사했다.'),
  yugr:       _g('유극량', '劉', 'joseon', 70, 70, 66, 46, 64, [], '노장. 임진강에서 섣불리 강을 건너 공격하는 것을 말렸으나 받아들여지지 않았고, 신할과 함께 싸우다 전사했다.'),
  leejangson: _g('이장손', '李', 'joseon', 30, 35, 82, 55, 45, ['cannon']),
  yigwang:    _g('이광', '李', 'joseon', 50, 48, 56, 66, 52, [], '전라도 관찰사. 1592년 6월 삼도 근왕병을 이끌고 북상했으나 용인에서 소수의 일본군에게 크게 패했다.'),
  song:       _g('송상현', '宋', 'joseon', 64, 52, 76, 74, 88, ['siege']),
  jeongbal:   _g('정발', '鄭', 'joseon', 66, 72, 56, 46, 70, ['siege', 'bow']),
  kimsimin:   _g('김시민', '金', 'joseon', 86, 78, 82, 66, 86, ['siege', 'cannon']),
  kimsi:      _g('김성일', '金', 'joseon', 55, 40, 80, 74, 82, ['uib'], '통신사 부사로 일본에 다녀와 "침략할 기미가 없다"고 보고했다. 전쟁이 나자 경상우도 초유사로 의병을 모으고 진주성 방어를 도왔으나 1593년 병으로 죽었다.'),
  kwonyul:    _g('권율', '權', 'joseon', 88, 72, 84, 72, 82, ['siege', 'build']),
  hwangjin:   _g('황진', '黃', 'joseon', 82, 88, 66, 50, 76, ['charge', 'bow']),
  jeongdam:   _g('정담', '鄭', 'joseon', 70, 75, 60, 50, 70, []),
  leebn:      _g('이복남', '李', 'joseon', 70, 72, 58, 48, 66, []),
  parkjin:    _g('박진', '朴', 'joseon', 72, 70, 72, 60, 70, ['cannon']),
  gwakjun:    _g('곽준', '郭', 'joseon', 66, 62, 66, 62, 76, ['siege']),
  jojongdo:   _g('조종도', '趙', 'joseon', 50, 45, 74, 66, 74, []),
  jgr:        _g('정기룡', '鄭', 'joseon', 82, 88, 62, 45, 70, ['charge', 'cav']),
  kimes:      _g('김응서', '金', 'joseon', 72, 82, 60, 45, 60, []),
  // 조선 수군
  yisunsin:   _g('이순신', '李', 'joseon', 96, 84, 93, 82, 92, ['navy', 'turtle', 'build']),
  wongyun:    _g('원균', '元', 'joseon', 70, 82, 45, 40, 50, ['navy']),
  yiukki:     _g('이억기', '李', 'joseon', 78, 76, 70, 60, 72, ['navy']),
  jeongun:    _g('정운', '鄭', 'joseon', 72, 82, 60, 42, 72, ['navy', 'charge']),
  eoyd:       _g('어영담', '魚', 'joseon', 70, 64, 76, 56, 66, ['navy'], '광양 현감. 남해안 물길에 밝아 이순신 함대의 길잡이를 맡았고, 여러 해전에서 공을 세웠다.'),
  iul:        _g('이운룡', '李', 'joseon', 70, 74, 62, 46, 62, ['navy'], '옥포 만호. 원균의 경상우수영에 있으면서 이순신에게 구원을 청하자고 주장했고, 옥포 해전 등에서 싸웠다.'),
  nadaeyong:  _g('나대용', '羅', 'joseon', 40, 40, 82, 66, 56, ['turtle'], '이순신 휘하 군관. 거북선을 만드는 일을 맡았고, 여러 해전에 참가했다.'),
  baeseol:    _g('배설', '裵', 'joseon', 58, 60, 52, 45, 45, ['navy']),
  // 의병·승병
  gwakjaewoo: _g('곽재우', '郭', 'joseon', 86, 86, 84, 52, 90, ['uib', 'trick']),
  kimmyeon:   _g('김면', '金', 'joseon', 72, 70, 72, 62, 78, ['uib'], '고령·거창 일대에서 의병을 일으켜 낙동강 수운을 위협했다. 경상우도 의병 도대장이 되었으나 1593년 병으로 죽었다.'),
  jih:        _g('정인홍', '鄭', 'joseon', 60, 55, 76, 72, 74, ['uib'], '합천에서 의병을 일으킨 남명 조식의 제자. 성주·합천 일대에서 일본군과 싸웠다.'),
  kwoneungsu: _g('권응수', '權', 'joseon', 76, 82, 64, 48, 70, ['uib', 'charge'], '영천의 의병장. 1592년 7월 영천성을 되찾아 경상좌도 일본군의 연결을 끊었다.'),
  hongkn:     _g('홍계남', '洪', 'joseon', 70, 80, 56, 44, 66, ['uib', 'cav'], '안성의 의병장. 경기 남부에서 일본군을 여러 차례 무찔렀다.'),
  joheon:     _g('조헌', '趙', 'joseon', 68, 64, 76, 70, 90, ['uib']),
  yeonggyu:   _g('영규', '靈', 'joseon', 70, 82, 58, 40, 78, ['monk']),
  gogm:       _g('고경명', '高', 'joseon', 66, 56, 80, 74, 86, ['uib']),
  kimcheonil: _g('김천일', '金', 'joseon', 72, 60, 74, 68, 82, ['uib']),
  choigh:     _g('최경회', '崔', 'joseon', 70, 68, 70, 64, 78, ['uib']),
  hyujeong:   _g('휴정', '休', 'joseon', 60, 48, 88, 72, 96, ['monk']),
  samyeong:   _g('사명대사', '惟', 'joseon', 74, 70, 90, 82, 90, ['monk', 'envoy']),
  jmb:        _g('정문부', '鄭', 'joseon', 82, 74, 80, 70, 82, ['uib']),
  yijeongam:  _g('이정암', '李', 'joseon', 74, 60, 80, 74, 80, ['siege']),
  kimdr:      _g('김덕령', '金', 'joseon', 72, 96, 56, 36, 72, ['uib', 'charge']),
  // 일본
  hideyoshi:  _g('도요토미 히데요시', '豊', 'japan', 80, 50, 90, 90, 90, ['king']),
  konishi:    _g('고니시 유키나가', '小', 'japan', 84, 70, 86, 76, 72, ['gun', 'envoy']),
  so:         _g('소 요시토시', '宗', 'japan', 66, 66, 72, 66, 66, ['envoy']),
  kato:       _g('가토 기요마사', '加', 'japan', 90, 93, 72, 66, 76, ['build', 'charge']),
  nabeshima:  _g('나베시마 나오시게', '鍋', 'japan', 80, 78, 74, 72, 66, []),
  kuroda:     _g('구로다 나가마사', '黑', 'japan', 82, 84, 72, 64, 70, ['gun']),
  moriy:      _g('모리 요시나리', '毛', 'japan', 68, 68, 56, 56, 56, [], '4군의 대장. 1592년 강원도 방면을 맡았다.'),
  shimazu:    _g('시마즈 요시히로', '島', 'japan', 92, 92, 80, 60, 82, ['gun', 'charge']),
  fukushima:  _g('후쿠시마 마사노리', '福', 'japan', 78, 88, 52, 56, 66, ['charge'], '5군의 대장. 충청도 일대를 맡아 점령지를 지켰다.'),
  hachisuka:  _g('하치스카 이에마사', '蜂', 'japan', 70, 70, 62, 62, 62, []),
  takakage:   _g('고바야카와 다카카게', '小', 'japan', 88, 76, 90, 82, 82, ['trick']),
  tachibana:  _g('다치바나 무네시게', '立', 'japan', 90, 94, 74, 62, 84, ['charge', 'gun']),
  ekei:       _g('안코쿠지 에케이', '安', 'japan', 50, 40, 80, 72, 70, ['envoy']),
  terumoto:   _g('모리 데루모토', '毛', 'japan', 74, 62, 68, 76, 72, [], '7군의 대장. 경상도 점령지와 보급로를 지키는 일을 맡았다.'),
  kikkawa:    _g('깃카와 히로이에', '吉', 'japan', 80, 80, 72, 62, 66, [], '모리 가문의 장수. 벽제관 전투에 참가했고, 정유재란 때 울산성 구원에 나섰다.'),
  ukita:      _g('우키타 히데이에', '宇', 'japan', 74, 72, 62, 62, 74, []),
  ishida:     _g('이시다 미쓰나리', '石', 'japan', 60, 44, 90, 92, 50, ['admin'], '도요토미의 봉행. 1592년 한양에 와서 전쟁 지휘와 강화 협상에 관여했다.'),
  wakizaka:   _g('와키자카 야스하루', '脇', 'japan', 72, 82, 58, 56, 60, ['navy']),
  todo:       _g('도도 다카토라', '藤', 'japan', 82, 80, 80, 82, 66, ['navy', 'build']),
  kuki:       _g('구키 요시타카', '九', 'japan', 82, 74, 66, 56, 64, ['navy']),
  katoyoshiaki: _g('가토 요시아키', '加', 'japan', 76, 78, 64, 60, 60, ['navy']),
  michiyuki:  _g('구루시마 미치유키', '來', 'japan', 68, 76, 52, 42, 54, ['navy']),
  michifusa:  _g('구루시마 미치후사', '來', 'japan', 72, 82, 56, 42, 56, ['navy']),
  hideaki:    _g('고바야카와 히데아키', '小', 'japan', 56, 62, 42, 40, 46, []),
  morih:      _g('모리 히데모토', '毛', 'japan', 72, 68, 62, 60, 62, []),
  asano:      _g('아사노 요시나가', '淺', 'japan', 70, 74, 62, 56, 60, [], '정유재란 때 울산 왜성 축성을 돕다가 조·명 연합군에게 포위되어 가토 기요마사와 함께 농성했다.'),
  // 명
  joseunghun: _g('조승훈', '祖', 'ming', 60, 74, 44, 40, 50, ['cav']),
  liruson:    _g('이여송', '李', 'ming', 88, 88, 72, 56, 72, ['cav', 'cannon']),
  liyebai:    _g('이여백', '李', 'ming', 74, 78, 60, 50, 60, ['cav'], '이여송의 동생. 평양성 탈환과 벽제관 전투에 참가했다.'),
  luoshang:   _g('낙상지', '駱', 'ming', 76, 86, 60, 46, 66, [], '절강 출신 남병(南兵)의 장수. 평양성 탈환 때 가장 먼저 성벽에 올랐다고 전한다.'),
  songyc:     _g('송응창', '宋', 'ming', 58, 30, 82, 80, 62, ['envoy'], '명군의 경략(총책임자). 평양성 탈환 뒤 강화 협상 쪽으로 기울었다.'),
  simyugyeong:_g('심유경', '沈', 'ming', 30, 30, 78, 70, 70, ['envoy']),
  liuting:    _g('유정(명)', '劉', 'ming', 76, 86, 60, 50, 62, []),
  yangwon:    _g('양원', '楊', 'ming', 70, 72, 58, 50, 56, []),
  magui:      _g('마귀', '麻', 'ming', 80, 80, 62, 50, 62, ['cav']),
  yanghao:    _g('양호', '楊', 'ming', 66, 56, 74, 70, 62, []),
  haisheng:   _g('해생', '解', 'ming', 74, 80, 58, 46, 60, ['cav'], '직산 전투에서 구로다 나가마사의 일본군을 막아 북상을 멈추게 한 명의 장수.'),
  dongyiyuan: _g('동일원', '董', 'ming', 68, 70, 56, 50, 56, []),
  chenlin:    _g('진린', '陳', 'ming', 74, 74, 64, 52, 56, ['navy']),
  dengzilong: _g('등자룡', '鄧', 'ming', 70, 76, 56, 44, 60, ['navy']),
};
// data-people.js 와 id 가 다른 장수
GD.PEOPLE_ID = { joseunghun: 'jo_seunghun', samyeong: 'samyeong', hyujeong: 'hyujeong', morih: 'mori_h' };

// ── 시나리오
// cities: 시작 상태 { o 세력, t 병력, f 군량, g 장수, s 함선 }
// waves: 일본군 증원 (그 달 초 쓰시마·나고야에 도착)
const _city = (o, t, g = [], extra = {}) => Object.assign({ o, t, g }, extra);
GD.SCEN = {
  s1592: {
    title: '1592년 4월 · 임진왜란',
    sub: '일본군 15만이 부산에 상륙한다. 나라를 지키고 7년의 전쟁을 버텨 내라.',
    start: [1592, 4],
    gold: { joseon: 2000, japan: 6000, ming: 3000 },
    cities: {
      hanyang: _city('joseon', 12000, ['seonjo', 'ryu', 'yidh', 'yihb', 'ydsu', 'lww', 'kmw', 'sinrip', 'yiil', 'singak', 'sinhal', 'yugr', 'leejangson'], { f: 60000, tr: 45 }),
      busan: _city('joseon', 3500, ['song', 'jeongbal'], { tr: 50, mo: 65 }),
      gimhae: _city('joseon', 1500), ungcheon: _city('joseon', 800),
      geoje: _city('joseon', 1500, ['wongyun', 'iul'], { s: { panok: 4 } }),
      miryang: _city('joseon', 1500, ['parkjin']), daegu: _city('joseon', 2000), gyeongju: _city('joseon', 2000),
      ulsan: _city('joseon', 2000), sangju: _city('joseon', 2000), andong: _city('joseon', 1500), seongju: _city('joseon', 1200),
      uiryeong: _city('joseon', 800), jinju: _city('joseon', 3000, ['kimsimin', 'kimsi']), sacheon: _city('joseon', 800),
      hamyang: _city('joseon', 1000, ['gwakjun']),
      jeonju: _city('joseon', 4000, ['yigwang', 'jeongdam']), namwon: _city('joseon', 2500, ['hwangjin']),
      gwangju: _city('joseon', 2500, ['kwonyul', 'leebn']), naju: _city('joseon', 2000), suncheon: _city('joseon', 1500),
      yeosu: _city('joseon', 3000, ['yisunsin', 'jeongun', 'eoyd', 'nadaeyong'], { s: { panok: 24, turtle: 1 }, tr: 70, mo: 70 }),
      haenam: _city('joseon', 2500, ['yiukki'], { s: { panok: 25 } }), geumsan: _city('joseon', 1000),
      chungju: _city('joseon', 2500), cheongju: _city('joseon', 2500), gongju: _city('joseon', 2500), hongju: _city('joseon', 1500),
      jiksan: _city('joseon', 1000), suwon: _city('joseon', 1500), paju: _city('joseon', 1000), ganghwa: _city('joseon', 1000),
      gaeseong: _city('joseon', 2500), chuncheon: _city('joseon', 1000), wonju: _city('joseon', 1500), gangneung: _city('joseon', 1000),
      haeju: _city('joseon', 2000), yeonan: _city('joseon', 1000), hwangju: _city('joseon', 1000),
      pyongyang: _city('joseon', 4000, [], { f: 30000 }), anju: _city('joseon', 1500), uiju: _city('joseon', 2500, ['kimes']),
      anbyeon: _city('joseon', 1000), hamheung: _city('joseon', 3000), gilju: _city('joseon', 1500),
      gyeongseong: _city('joseon', 3000, [], { tr: 60 }), hoeryong: _city('joseon', 2000),
      hansan: _city('joseon', 0),
      liaodong: _city('ming', 0, ['simyugyeong']),
      tsushima: _city('japan', 52500, ['konishi', 'so', 'kato', 'nabeshima', 'kuroda', 'todo'], { s: { atake: 6, seki: 40 }, f: 80000, tr: 85, mo: 90 }),
      nagoya: _city('japan', 0, ['hideyoshi'], { f: 100000 }),
    },
    waves: [
      { at: [1592, 5], to: 'tsushima', t: 92000, g: ['moriy', 'shimazu', 'fukushima', 'hachisuka', 'takakage', 'tachibana', 'ekei', 'terumoto', 'kikkawa', 'ukita', 'katoyoshiaki', 'michiyuki'], s: { atake: 4, seki: 35 }, f: 60000 },
      { at: [1592, 6], to: 'tsushima', t: 8000, g: ['wakizaka', 'kuki', 'ishida'], s: { atake: 14, seki: 86 }, f: 30000 },
    ],
  },
  s1597: {
    title: '1597년 1월 · 정유재란',
    sub: '강화 협상이 깨지고 일본군 14만이 다시 바다를 건넌다. 남해안 왜성의 일본군과 맞서라.',
    start: [1597, 1],
    gold: { joseon: 2500, japan: 6000, ming: 4000 },
    reforms: ['hullyeon', 'sogo', 'sanseong'],
    dead: ['sinrip', 'song', 'jeongbal', 'singak', 'sinhal', 'yugr', 'kimsimin', 'hwangjin', 'gogm', 'joheon', 'yeonggyu', 'kimcheonil',
      'choigh', 'jeongun', 'jeongdam', 'kimdr', 'kimsi', 'kimmyeon', 'yigwang', 'leejangson', 'michiyuki', 'joseunghun', 'songyc', 'liyebai', 'luoshang'],
    cities: {
      hanyang: _city('joseon', 14000, ['seonjo', 'gwanghae', 'ryu', 'yidh', 'yihb', 'ydsu', 'kmw'], { f: 50000, tr: 60 }),
      busan: _city('japan', 6000, ['so'], { castle: 'wae', wall: 75, tr: 80, mo: 75, f: 30000 }),
      gimhae: _city('japan', 3000, [], { castle: 'wae', wall: 65, f: 12000 }),
      ungcheon: _city('japan', 3000, [], { castle: 'wae', wall: 65, f: 12000, s: { seki: 20 } }),
      geoje: _city('japan', 2500, [], { castle: 'wae', wall: 60, f: 10000 }),
      ulsan: _city('japan', 3000, [], { castle: 'wae', wall: 70, f: 15000 }),
      miryang: _city('joseon', 2500), daegu: _city('joseon', 3500, ['kimes']), gyeongju: _city('joseon', 3000, ['parkjin']),
      sangju: _city('joseon', 2500, ['jgr']), andong: _city('joseon', 2000), seongju: _city('joseon', 2500, ['jih']),
      uiryeong: _city('joseon', 3000, ['kwonyul', 'gwakjaewoo'], { wall: 45 }), jinju: _city('joseon', 3500, ['lww'], { wall: 70 }),
      sacheon: _city('joseon', 1500), hamyang: _city('joseon', 2500, ['gwakjun', 'jojongdo'], { wall: 65 }),
      jeonju: _city('joseon', 4000, []), namwon: _city('joseon', 3000, ['leebn'], { wall: 60 }),
      gwangju: _city('joseon', 3000, []), naju: _city('joseon', 2500), suncheon: _city('joseon', 2000),
      yeosu: _city('joseon', 2000, [], { s: { panok: 10 } }), haenam: _city('joseon', 2000, [], { s: { panok: 8 } }), geumsan: _city('joseon', 1500),
      hansan: _city('joseon', 6000, ['yisunsin', 'yiukki', 'wongyun', 'baeseol', 'eoyd', 'iul', 'nadaeyong'], { s: { panok: 70, turtle: 3 }, tr: 80, mo: 75, f: 30000 }),
      chungju: _city('joseon', 3000), cheongju: _city('joseon', 3000), gongju: _city('joseon', 3000), hongju: _city('joseon', 2000),
      jiksan: _city('joseon', 1500), suwon: _city('joseon', 2000), paju: _city('joseon', 1500), ganghwa: _city('joseon', 1500),
      gaeseong: _city('joseon', 2500), chuncheon: _city('joseon', 1500), wonju: _city('joseon', 2000), gangneung: _city('joseon', 1500),
      haeju: _city('joseon', 2000), yeonan: _city('joseon', 1500, ['yijeongam']), hwangju: _city('joseon', 1500),
      pyongyang: _city('joseon', 4000, ['samyeong', 'hyujeong']), anju: _city('joseon', 2000), uiju: _city('joseon', 2500),
      anbyeon: _city('joseon', 1500), hamheung: _city('joseon', 3000, ['jmb']), gilju: _city('joseon', 1500),
      gyeongseong: _city('joseon', 3000), hoeryong: _city('joseon', 2000),
      liaodong: _city('ming', 0, ['simyugyeong']),
      tsushima: _city('japan', 21000, ['kato', 'konishi', 'nabeshima'], { s: { atake: 6, seki: 50 }, f: 60000, tr: 85, mo: 85 }),
      nagoya: _city('japan', 0, ['hideyoshi'], { f: 100000 }),
    },
    waves: [
      { at: [1597, 7], to: 'tsushima', t: 100000, g: ['ukita', 'hideaki', 'morih', 'kuroda', 'shimazu', 'hachisuka', 'tachibana', 'todo', 'wakizaka', 'katoyoshiaki', 'michifusa', 'asano', 'kikkawa'], s: { atake: 20, seki: 200 }, f: 80000 },
    ],
  },
};

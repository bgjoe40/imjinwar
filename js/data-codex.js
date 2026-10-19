// 무기·함선·전술·성곽 도감
// cat: ship | gun | weapon | tactic | fort, side: 세력, battles: 관련 전투(BATTLES의 이름), svg: 그림
const CODEX_CATS = { ship: '함선', gun: '화약 무기', weapon: '활과 칼', tactic: '전술', fort: '성곽' };

// 그림 조각
const codexSvg = (body, vb = '0 0 120 70') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const CODEX_SEA = '<path d="M0 58 Q10 54 20 58 T40 58 T60 58 T80 58 T100 58 T120 58 V70 H0 Z" fill="#3c6f8f" opacity=".55"/>';

const CODEX = [
  // ───── 함선
  { id: 'panokseon', cat: 'ship', side: 'joseon', name: '판옥선', hanja: '板屋船', battles: ['okpo', 'hansan', 'busanpo', 'myeongnyang', 'noryang'],
    svg: codexSvg(`${CODEX_SEA}<path d="M10 40 H110 L100 56 H20 Z" fill="#7a5a36" stroke="#2b1d10" stroke-width="2"/>
      <rect x="26" y="24" width="68" height="16" fill="#a07a4a" stroke="#2b1d10" stroke-width="2"/>
      <path d="M26 24 H94" stroke="#2b1d10" stroke-width="3"/><path d="M60 4 V24" stroke="#ddd" stroke-width="2"/>
      <path d="M61 6 L84 16 L61 20 Z" fill="#3b82f6"/><g stroke="#2b1d10" stroke-width="1.5">${[34, 46, 58, 70, 82].map((x) => `<rect x="${x}" y="29" width="5" height="5" fill="#2b1d10"/>`).join('')}</g>
      <g stroke="#5b4026" stroke-width="2">${[24, 36, 48, 60, 72, 84, 96].map((x) => `<path d="M${x} 50 L${x - 6} 62"/>`).join('')}</g>`),
    text: '1555년 처음 만들어진 조선 수군의 주력 전선이다. 배 위에 판자로 지붕을 덮은 2층 구조로, 아래층에서는 노꾼이 노를 젓고 위층에서는 군사가 활과 총통으로 싸웠다.',
    facts: ['배가 높아 일본군이 뛰어올라 칼싸움을 벌이는 전술(등선육박전)이 잘 통하지 않았다.', '바닥이 평평한 평저선이라 제자리에서 방향을 틀기 쉬워, 학익진처럼 진형을 바꾸며 포를 쏘기에 알맞았다.', '튼튼해서 무거운 천자·지자총통을 싣고 쏠 수 있었다.'] },
  { id: 'geobukseon', cat: 'ship', side: 'joseon', name: '거북선', hanja: '龜船', battles: ['sacheon', 'dangpo', 'danghang', 'hansan'],
    svg: codexSvg(`${CODEX_SEA}<path d="M14 44 H106 L98 56 H22 Z" fill="#7a5a36" stroke="#2b1d10" stroke-width="2"/>
      <path d="M18 44 Q60 4 102 44 Z" fill="#3f5a3a" stroke="#1d2a1a" stroke-width="2"/>
      <g fill="#cfd6c8">${[30, 40, 50, 60, 70, 80, 90].map((x, i) => `<path d="M${x} ${i % 2 ? 26 : 30} l2 -5 l2 5 z"/>`).join('')}</g>
      <path d="M100 38 q14 -10 14 2 q-2 6 -10 6 z" fill="#b8541f" stroke="#2b1d10" stroke-width="1.5"/><circle cx="108" cy="38" r="1.6" fill="#000"/>
      <g fill="#1d140c">${[34, 50, 66, 82].map((x) => `<rect x="${x}" y="46" width="5" height="4"/>`).join('')}</g>`),
    text: '판옥선 위에 덮개를 씌우고 쇠못을 꽂아 적이 뛰어오르지 못하게 만든 돌격선이다. 머리의 용머리와 배 사방의 포문으로 포를 쏘며 적진 한가운데를 휘저었다.',
    facts: ['이순신의 전라좌수영에서 전쟁 직전에 완성되어, 1592년 사천 해전에서 처음 실전에 나섰다.', '임진왜란 때 운용된 거북선은 두세 척 정도였던 것으로 본다.', '실물이 남아 있지 않아, 덮개가 철갑이었는지 등 자세한 구조에는 여러 견해가 있다.'] },
  { id: 'hyeopseon', cat: 'ship', side: 'joseon', name: '협선 · 포작선', hanja: '挾船 · 鮑作船', battles: ['okpo', 'busanpo'],
    svg: codexSvg(`${CODEX_SEA}<path d="M30 46 H90 L82 56 H38 Z" fill="#8a6a44" stroke="#2b1d10" stroke-width="2"/><path d="M60 18 V46" stroke="#ddd" stroke-width="2"/>
      <path d="M61 20 L78 38 L61 38 Z" fill="#efe6cf" stroke="#2b1d10"/>`),
    text: '협선은 판옥선 곁에서 정찰과 연락, 짐 나르기를 맡은 작은 배다. 포작선은 바다에서 해산물을 따던 어민(포작인)의 배로, 전쟁 때 함대에 동원되었다.',
    facts: ['옥포 해전 때 이순신 함대에는 판옥선 24척, 협선 15척, 포작선 46척이 있었다고 장계에 적혀 있다.', '부산포 해전 때 조선 함대 166척 가운데 92척이 협선이었다.'] },
  { id: 'atakebune', cat: 'ship', side: 'japan', name: '아타케부네', hanja: '安宅船', battles: ['hansan', 'angolpo', 'dangpo', 'danghang'],
    svg: codexSvg(`${CODEX_SEA}<path d="M8 42 H112 L104 56 H16 Z" fill="#5b3a2a" stroke="#1d120c" stroke-width="2"/>
      <rect x="24" y="26" width="72" height="16" fill="#8a5a3a" stroke="#1d120c" stroke-width="2"/>
      <rect x="44" y="10" width="30" height="16" fill="#a8744a" stroke="#1d120c" stroke-width="2"/><path d="M40 10 H78 L72 4 H46 Z" fill="#3a2418"/>
      <path d="M94 26 V4" stroke="#ddd" stroke-width="2"/><path d="M95 6 L110 12 L95 16 Z" fill="#ef4444"/>`),
    text: '일본 수군의 가장 큰 군선으로, 배 위에 누각(층루)을 올려 대장선으로 쓰였다. 많은 병사를 태우고 적선에 다가가 올라타 싸우는 데 알맞았다.',
    facts: ['당포·당항포 해전에서 이순신은 누각을 높이 세운 적의 대장선을 먼저 노렸다.', '배는 크지만 판옥선보다 몸체가 약하고 큰 대포를 싣기 어려웠다.'] },
  { id: 'sekibune', cat: 'ship', side: 'japan', name: '세키부네 · 고바야', hanja: '関船 · 小早', battles: ['okpo', 'hansan', 'chilcheon', 'myeongnyang', 'noryang'],
    svg: codexSvg(`${CODEX_SEA}<path d="M14 44 H106 L96 56 H24 Z" fill="#6b4630" stroke="#1d120c" stroke-width="2"/>
      <rect x="30" y="32" width="56" height="12" fill="#8a5a3a" stroke="#1d120c" stroke-width="2"/><path d="M58 8 V32" stroke="#ddd" stroke-width="2"/>
      <path d="M59 10 L80 26 L59 28 Z" fill="#efe6cf" stroke="#1d120c"/>`),
    text: '세키부네는 일본 수군의 주력인 중형 군선이고, 고바야는 그보다 작고 빠른 배다. 빠르게 다가가 조총을 쏘고 적선에 올라타 싸웠다.',
    facts: ['얇은 판자로 만들어 가볍고 빨랐지만, 판옥선의 총통에 맞으면 쉽게 부서졌다.', '칠천량 해전에서는 밤에 작은 배로 조선 함대에 다가가 올라타는 전술이 크게 성공했다.'] },
  { id: 'mingship', cat: 'ship', side: 'ming', name: '명 수군의 전선', hanja: '沙船 · 唬船 등', battles: ['waegyo', 'noryang'],
    svg: codexSvg(`${CODEX_SEA}<path d="M10 42 H110 L100 56 H20 Z" fill="#6b5b3a" stroke="#1d160c" stroke-width="2"/>
      <rect x="30" y="30" width="60" height="12" fill="#8f7a4a" stroke="#1d160c" stroke-width="2"/>
      <path d="M48 6 V30 M72 10 V30" stroke="#ddd" stroke-width="2"/><path d="M49 8 L62 26 L49 26 Z M73 12 L84 26 L73 26 Z" fill="#eab308" opacity=".85"/>`),
    text: '1598년 진린이 이끌고 온 명 수군은 사선(沙船)·호선(唬船) 등 크고 작은 배를 함께 썼다고 기록된다. 조선 수군과 함께 순천 왜교성 공격과 노량 해전을 치렀다.',
    facts: ['순천 왜교성 전투 때 썰물에 얕은 바다에 얹힌 명 전선 수십 척이 일본군에게 불탔다.', '노량 해전에서는 조선 함대와 함께 해협 출구에서 일본 함대를 협공했다.'] },

  // ───── 화약 무기
  { id: 'chongtong', cat: 'gun', side: 'joseon', name: '천자·지자·현자·황자총통', hanja: '天字·地字·玄字·黃字銃筒', battles: ['okpo', 'hansan', 'jinju1', 'myeongnyang'],
    svg: codexSvg(`<rect x="14" y="26" width="78" height="18" rx="7" fill="#3b3b3b" stroke="#111" stroke-width="2"/>
      <g stroke="#777" stroke-width="3">${[28, 44, 60, 76].map((x) => `<path d="M${x} 26 V44"/>`).join('')}</g>
      <rect x="90" y="29" width="14" height="12" rx="2" fill="#3b3b3b" stroke="#111" stroke-width="2"/>
      <path d="M104 35 H118" stroke="#b8541f" stroke-width="3"/><path d="M114 30 L120 35 L114 40" fill="none" stroke="#b8541f" stroke-width="3"/>
      <path d="M6 44 L22 60 H96 L104 44" fill="#7a5a36" stroke="#2b1d10" stroke-width="2"/>`),
    text: '조선의 대표적인 화포로, 크기에 따라 천자문 순서대로 천(天)·지(地)·현(玄)·황(黃)으로 이름 붙였다. 쇠로 만든 통에 화약을 넣고 큰 화살(대장군전)이나 쇠구슬 여러 개를 쏘았다.',
    facts: ['천자총통이 가장 크고, 지자·현자·황자로 갈수록 작아진다.', '판옥선에 실어 적선을 멀리서 부수는 데 쓰였고, 이것이 조선 수군 승리의 큰 바탕이 되었다.', '1차 진주성 전투에서는 현자총통으로 일본군의 공성탑을 부쉈다.'] },
  { id: 'bigyeok', cat: 'gun', side: 'joseon', name: '비격진천뢰', hanja: '飛擊震天雷', battles: ['gyeongju', 'jinju1', 'haengju'],
    svg: codexSvg(`<circle cx="60" cy="38" r="22" fill="#3a3a3a" stroke="#111" stroke-width="3"/><circle cx="52" cy="30" r="5" fill="#777" opacity=".6"/>
      <rect x="56" y="10" width="8" height="8" fill="#555" stroke="#111"/><path d="M60 10 q6 -8 14 -4" stroke="#b8541f" stroke-width="2" fill="none"/>
      <g fill="#ffb02e">${[[84, 18], [92, 30], [30, 20], [24, 44]].map(([x, y]) => `<path d="M${x} ${y} l3 -6 l3 6 l-3 6 z"/>`).join('')}</g>`),
    text: '둥근 쇠 껍데기 속에 화약과 쇳조각을 넣고, 나선형 홈을 판 나무(목곡)에 감은 심지의 길이로 터지는 시간을 조절한 포탄이다. 대완구라는 큰 포로 쏘아 보냈다.',
    facts: ['화포장 이장손이 만든 것으로 전한다.', '1592년 경주성 탈환 때 성 안에 떨어진 비격진천뢰가 잠시 뒤 터지자 일본군이 크게 놀라 달아났다.', '오늘날의 "시한폭탄"과 비슷한 원리여서 당시로서는 매우 앞선 무기였다.'] },
  { id: 'singijeon', cat: 'gun', side: 'joseon', name: '신기전 · 화차', hanja: '神機箭 · 火車', battles: ['haengju'],
    svg: codexSvg(`<path d="M20 52 H96" stroke="#5b4026" stroke-width="4"/><circle cx="32" cy="58" r="8" fill="#5b4026" stroke="#2b1d10" stroke-width="2"/><circle cx="86" cy="58" r="8" fill="#5b4026" stroke="#2b1d10" stroke-width="2"/>
      <rect x="24" y="22" width="68" height="28" fill="#8a6a44" stroke="#2b1d10" stroke-width="2" transform="rotate(-14 58 36)"/>
      <g fill="#111" transform="rotate(-14 58 36)">${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => `<circle cx="${30 + c * 9}" cy="${27 + r * 6}" r="1.6"/>`).join('')).join('')}</g>
      <g stroke="#b8541f" stroke-width="2">${[0, 1, 2].map((i) => `<path d="M${96 + i * 2} ${18 - i * 6} l16 -6"/>`).join('')}</g>`),
    text: '신기전은 화약의 힘으로 날아가는 로켓 화살이고, 화차는 수레 위의 틀에 신기전이나 총통을 수십 개 꽂아 한꺼번에 쏘는 무기다.',
    facts: ['신기전은 세종 때, 화차는 문종 때(1451년) 만들어졌다.', '행주대첩에서 화차와 신기전이 산비탈을 오르는 일본군에게 큰 피해를 주었다. 이때 쓴 화차는 변이중이 개량한 것으로 전한다.'] },
  { id: 'jochong', cat: 'gun', side: 'japan', name: '조총', hanja: '鳥銃', battles: ['dongnae', 'tangeumdae', 'sangju', 'pyongyang1', 'imjin'],
    svg: codexSvg(`<path d="M8 34 H96 V40 H8 Z" fill="#3b3b3b" stroke="#111" stroke-width="2"/>
      <path d="M60 38 H110 L116 52 L104 56 L92 44 H60 Z" fill="#7a4a2a" stroke="#2b1d10" stroke-width="2"/>
      <path d="M72 44 q-4 8 2 12" stroke="#222" stroke-width="2" fill="none"/><path d="M80 34 q4 -10 12 -8" stroke="#b8541f" stroke-width="2" fill="none"/>`),
    text: '불붙은 심지(화승)로 화약을 터뜨려 탄환을 쏘는 화승총이다. "날아가는 새도 맞힐 수 있다"는 뜻에서 조총이라 불렀다.',
    facts: ['1543년 포르투갈 사람을 통해 일본에 전해진 뒤, 전국시대를 거치며 대량으로 만들어졌다.', '조선의 활보다 사거리와 위력이 뛰어나 개전 초 조선 육군이 연패한 큰 원인이 되었다.', '비가 오면 심지와 화약이 젖어 쓰기 어려웠다.', '조선은 전쟁 중 조총을 배워 만들고, 훈련도감에서 조총을 쏘는 포수를 길렀다.'] },
  { id: 'bullanggi', cat: 'gun', side: 'ming', name: '불랑기포 · 호준포', hanja: '佛狼機砲 · 虎蹲砲', battles: ['pyongyang', 'sacheon2'],
    svg: codexSvg(`<rect x="16" y="28" width="70" height="14" rx="5" fill="#4a4a3a" stroke="#111" stroke-width="2"/><rect x="70" y="22" width="16" height="10" fill="#6b6b4a" stroke="#111" stroke-width="2"/>
      <path d="M86 35 H104" stroke="#444" stroke-width="5"/><path d="M30 42 L22 62 M70 42 L78 62 M50 42 V62" stroke="#5b4026" stroke-width="4"/>
      <circle cx="108" cy="35" r="4" fill="#ffb02e"/>`),
    text: '불랑기포는 포르투갈(불랑기)에서 전해진 화포로, 화약과 탄환을 넣은 작은 통(자포)을 뒤에서 갈아 끼워 빨리 쏠 수 있었다. 호준포는 범이 웅크린 모양으로 다리를 달아 땅에 세워 쏘는 작은 대포다.',
    facts: ['1593년 평양성 탈환 전투에서 명군이 이 화포들로 성문과 성벽을 부쉈다.', '조선도 불랑기포를 받아들여 수군과 육군에서 사용했다.'] },

  // ───── 활과 칼
  { id: 'gakgung', cat: 'weapon', side: 'joseon', name: '각궁 · 편전', hanja: '角弓 · 片箭', battles: ['jinju1', 'haengju', 'ichi', 'jeongam'],
    svg: codexSvg(`<path d="M40 8 Q14 36 40 64" stroke="#5b3a1e" stroke-width="5" fill="none"/><path d="M40 8 Q30 36 40 64" stroke="#e8dcc0" stroke-width="1.5" fill="none"/>
      <path d="M44 36 H112" stroke="#8a6a44" stroke-width="2.5"/><path d="M106 31 L116 36 L106 41 Z" fill="#555"/><path d="M48 32 L56 36 L48 40" stroke="#3b82f6" stroke-width="2" fill="none"/>
      <path d="M60 48 H96" stroke="#8a6a44" stroke-width="2"/><path d="M92 45 L98 48 L92 51 Z" fill="#555"/>`),
    text: '각궁은 물소 뿔과 대나무, 소 힘줄을 겹쳐 만든 조선의 활로 작지만 힘이 세다. 편전(애기살)은 짧은 화살을 통아라는 대롱에 넣어 쏘는 것으로, 멀리 빠르게 날아가 적이 피하기 어려웠다.',
    facts: ['활은 조선 군사의 주력 무기였지만, 조총보다 배우기는 쉬워도 사거리와 위력에서 밀렸다.', '성을 지키는 싸움에서는 높은 곳에서 쏘는 활이 큰 힘을 냈다.'] },
  { id: 'japansword', cat: 'weapon', side: 'japan', name: '일본도 · 장창', hanja: '日本刀 · 槍', battles: ['tangeumdae', 'byeokje', 'yongin'],
    svg: codexSvg(`<path d="M10 52 Q60 40 104 18" stroke="#d6d6d6" stroke-width="4" fill="none"/><path d="M10 52 L22 50" stroke="#3a2418" stroke-width="7"/>
      <path d="M22 46 L24 56" stroke="#c9a35a" stroke-width="3"/><path d="M14 64 L112 60" stroke="#6b4a2a" stroke-width="3"/><path d="M110 56 L120 60 L110 64 Z" fill="#bbb"/>`),
    text: '전국시대를 거친 일본군은 긴 칼과 장창을 다루는 근접전에 능했다. 조총으로 적을 흔든 뒤 창과 칼로 돌격하는 방식으로 싸웠다.',
    facts: ['탄금대 전투에서는 장창을 든 일본 보병이 조선 기병의 돌격을 막았다.', '벽제관 전투에서는 진창에 빠진 명 기병이 일본군의 칼과 창에 크게 당했다.'] },

  // ───── 전술
  { id: 'hagik', cat: 'tactic', side: 'joseon', name: '학익진', hanja: '鶴翼陣', battles: ['hansan'],
    svg: codexSvg(`${CODEX_SEA}<g fill="#3b82f6">${[[18, 18], [28, 30], [40, 40], [60, 46], [80, 40], [92, 30], [102, 18]].map(([x, y]) => `<rect x="${x - 5}" y="${y - 3}" width="10" height="6" rx="2"/>`).join('')}</g>
      <g fill="#ef4444">${[[52, 18], [62, 14], [70, 22], [58, 26]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 3}" width="8" height="5" rx="1.5"/>`).join('')}</g>
      <g stroke="#ffb02e" stroke-width="1.2" stroke-dasharray="2 2">${[[28, 30], [40, 40], [60, 46], [80, 40], [92, 30]].map(([x, y]) => `<path d="M${x} ${y} L60 20"/>`).join('')}</g>`),
    text: '학이 날개를 펼친 듯 배들을 반원 모양으로 벌려 세워, 그 안으로 들어온 적을 여러 방향에서 한꺼번에 공격하는 진형이다.',
    facts: ['한산도 대첩에서 이순신은 유인 함대로 적을 넓은 바다로 끌어낸 뒤 학익진으로 에워싸 47척을 격침했다.', '판옥선이 제자리에서 방향을 바꾸기 쉬웠기에 가능한 전술이었다.'] },
  { id: 'jangsa', cat: 'tactic', side: 'joseon', name: '장사진', hanja: '長蛇陣', battles: ['busanpo'],
    svg: codexSvg(`${CODEX_SEA}<g fill="#3b82f6">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${12 + i * 12}" y="${44 - i * 4}" width="10" height="6" rx="2"/>`).join('')}</g>
      <g fill="#ef4444">${[[100, 16], [110, 22], [104, 28]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 3}" width="8" height="5" rx="1.5"/>`).join('')}</g>`),
    text: '긴 뱀처럼 배들을 한 줄로 길게 늘어세워 차례로 돌진하는 진형이다. 좁은 포구 안으로 들어가 정박한 적선을 공격할 때 알맞았다.',
    facts: ['1592년 부산포 해전에서 조선 함대는 장사진으로 부산포에 돌입해 100여 척을 격파했다.'] },
  { id: 'baesu', cat: 'tactic', side: 'joseon', name: '배수진', hanja: '背水陣', battles: ['tangeumdae', 'imjin'],
    svg: codexSvg(`<path d="M0 8 H120 V20 H0 Z" fill="#3c6f8f" opacity=".7"/><g fill="#3b82f6">${[20, 40, 60, 80, 100].map((x) => `<rect x="${x - 7}" y="26" width="14" height="8" rx="2"/>`).join('')}</g>
      <g fill="#ef4444">${[14, 34, 54, 74, 94, 108].map((x, i) => `<rect x="${x - 6}" y="${54 - (i % 2) * 4}" width="12" height="7" rx="2"/>`).join('')}</g>
      <path d="M8 46 Q60 36 112 46" stroke="#ffb02e" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>`),
    text: '강이나 물을 등지고 진을 쳐서, 물러설 곳을 없애 군사들이 죽기를 각오하고 싸우게 하는 진법이다.',
    facts: ['신립은 탄금대에서 남한강을 등지고 배수진을 쳤지만, 논밭과 습지에서 기병이 제대로 움직이지 못해 크게 졌다.', '물러설 곳이 없다는 것은 지면 전멸한다는 뜻이기도 해, 지형과 병력을 잘 따져야 하는 진법이다.'] },
  { id: 'deungseon', cat: 'tactic', side: 'japan', name: '등선육박전', hanja: '登船肉薄戰', battles: ['chilcheon', 'okpo'],
    svg: codexSvg(`${CODEX_SEA}<path d="M8 40 H58 L52 54 H14 Z" fill="#7a5a36" stroke="#2b1d10" stroke-width="2"/><rect x="16" y="28" width="34" height="12" fill="#a07a4a" stroke="#2b1d10" stroke-width="2"/>
      <path d="M62 46 H112 L106 56 H68 Z" fill="#5b3a2a" stroke="#1d120c" stroke-width="2"/>
      <path d="M64 46 L50 30" stroke="#8a6a44" stroke-width="3"/><g fill="#ef4444">${[[70, 38], [80, 40], [56, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5"/>`).join('')}</g>`),
    text: '배를 적선에 바짝 붙인 뒤 병사들이 건너가 칼과 창으로 싸워 배를 빼앗는 일본 수군의 전술이다.',
    facts: ['판옥선은 배가 높고 총통으로 멀리서 공격했기 때문에, 이 전술이 좀처럼 통하지 않았다.', '칠천량 해전에서는 밤중에 지친 조선 함대를 둘러싸고 작은 배로 다가가 이 전술로 크게 이겼다.'] },
  { id: 'surak', cat: 'tactic', side: 'japan', name: '수륙병진', hanja: '水陸竝進', battles: ['hansan', 'myeongnyang'],
    svg: codexSvg(`<path d="M8 14 H70" stroke="#ef4444" stroke-width="4" stroke-dasharray="8 5"/><path d="M66 8 L78 14 L66 20 Z" fill="#ef4444"/>
      <path d="M0 40 H120 V70 H0 Z" fill="#3c6f8f" opacity=".55"/><path d="M8 52 H70" stroke="#ef4444" stroke-width="4" stroke-dasharray="8 5"/><path d="M66 46 L78 52 L66 58 Z" fill="#ef4444"/>
      <path d="M90 6 V64" stroke="#3b82f6" stroke-width="5"/><text x="96" y="58" font-size="10" fill="#cfe0ff">차단</text>`),
    text: '육군이 북쪽으로 진격하는 동안, 수군이 남해를 돌아 서해로 올라가며 군량과 병력을 실어 나르는 일본군의 작전이다.',
    facts: ['1592년 한산도 대첩으로 일본 수군이 남해를 지나지 못하게 되면서 이 계획이 처음 좌절되었다.', '1597년에도 일본군은 같은 작전을 노렸지만 명량 해전에서 다시 막혔다.'] },
  { id: 'ambush', cat: 'tactic', side: 'joseon', name: '유인과 매복', hanja: '誘引 · 埋伏', battles: ['danghang', 'hansan', 'haeyu', 'jeongam', 'imjin', 'byeokje'],
    svg: codexSvg(`<path d="M10 30 H60" stroke="#3b82f6" stroke-width="3" stroke-dasharray="5 4"/><path d="M14 24 L4 30 L14 36" fill="none" stroke="#3b82f6" stroke-width="3"/>
      <g fill="#ef4444"><rect x="64" y="26" width="12" height="8" rx="2"/><rect x="80" y="26" width="12" height="8" rx="2"/></g>
      <path d="M0 52 Q30 40 60 52 T120 52" fill="#3f5a3a" opacity=".7"/><path d="M0 12 Q30 0 60 12 T120 12 V0 H0 Z" fill="#3f5a3a" opacity=".7"/>
      <g fill="#22c55e"><rect x="30" y="46" width="10" height="6" rx="2"/><rect x="66" y="8" width="10" height="6" rx="2"/></g>`),
    text: '거짓으로 물러나 적을 불리한 곳으로 끌어들이거나, 숨어 있다가 지나가는 적을 갑자기 치는 전술이다. 양쪽 모두 이 전술을 썼다.',
    facts: ['조선 수군은 당항포·한산도에서 거짓 후퇴로 적을 넓은 바다로 끌어냈다.', '해유령·정암진에서는 조선군과 의병이 매복으로 이겼다.', '반대로 임진강·벽제관에서는 조선군과 명군이 일본군의 거짓 후퇴와 매복에 걸려 크게 졌다.'] },

  // ───── 성곽
  { id: 'eupseong', cat: 'fort', side: 'joseon', name: '읍성', hanja: '邑城', battles: ['dongnae', 'busanjin', 'jinju1', 'jinju2', 'namwon', 'cheongju', 'gyeongju', 'yeonan'],
    svg: codexSvg(`<path d="M10 60 V24 H110 V60 Z" fill="#8b7d68" stroke="#2b2016" stroke-width="2"/><g fill="#8b7d68" stroke="#2b2016" stroke-width="2">${[10, 26, 42, 58, 74, 90].map((x) => `<rect x="${x}" y="16" width="10" height="8"/>`).join('')}</g>
      <rect x="50" y="38" width="20" height="22" rx="10" fill="#2a2016"/><path d="M44 16 L60 4 L76 16 Z" fill="#5b3a1e"/>
      <g fill="#c9b99a">${[18, 30, 84, 96].map((x) => `<rect x="${x}" y="34" width="8" height="10"/>`).join('')}</g>`),
    text: '고을(읍)을 둘러싼 성으로, 관아와 백성의 집이 성 안에 있었다. 평지나 낮은 언덕에 있어 평소 생활에는 편했지만, 대군을 막기에는 불리한 경우가 많았다.',
    facts: ['동래·부산진·청주·남원 등 많은 읍성이 일본군의 대군과 조총 앞에 함락되었다.', '진주성은 남강 절벽과 해자를 낀 튼튼한 성이어서 1차 전투에서는 지켜 냈다.', '대부분의 읍성은 일제강점기에 헐려 지금은 일부만 남아 있다.'] },
  { id: 'sanseong', cat: 'fort', side: 'joseon', name: '산성', hanja: '山城', battles: ['haengju', 'hwangseok'],
    svg: codexSvg(`<path d="M0 64 L34 18 L58 34 L80 10 L120 64 Z" fill="#4f6b45" stroke="#22301e" stroke-width="2"/>
      <path d="M22 34 L34 18 L58 34 L80 10 L98 36" stroke="#8b7d68" stroke-width="5" fill="none"/><path d="M76 4 V14" stroke="#eee" stroke-width="1.5"/><path d="M77 5 L86 8 L77 11 Z" fill="#3b82f6"/>`),
    text: '산의 능선과 골짜기를 따라 쌓은 성이다. 높은 곳에 있어 적이 오르기 어렵고, 위에서 활과 돌로 내려칠 수 있어 적은 수로도 많은 적을 막을 수 있었다.',
    facts: ['권율은 행주산성에서 2,300여 명으로 3만여 일본군을 물리쳤다.', '조선은 적이 오면 백성과 곡식을 산성으로 옮기고 들판을 비우는 방어(청야입보)를 전통으로 삼았다.', '황석산성처럼 내부의 배신이나 압도적인 병력에 무너진 경우도 있었다.'] },
  { id: 'waeseong', cat: 'fort', side: 'japan', name: '왜성', hanja: '倭城', battles: ['ulsan', 'ulsan2', 'waegyo', 'sacheon2'],
    svg: codexSvg(`<path d="M8 62 L22 40 H98 L112 62 Z" fill="#8a8476" stroke="#2b2820" stroke-width="2"/><path d="M28 40 L36 26 H84 L92 40" fill="#9a9384" stroke="#2b2820" stroke-width="2"/>
      <rect x="46" y="10" width="28" height="16" fill="#e8e0cc" stroke="#2b2820" stroke-width="2"/><path d="M40 12 H80 L72 4 H48 Z" fill="#3a3a3a"/>
      <path d="M8 62 L22 40 M112 62 L98 40" stroke="#555" stroke-width="2"/>`),
    text: '일본군이 남해안 곳곳에 쌓은 일본식 성이다. 돌을 비스듬히 높게 쌓은 성벽과 여러 겹으로 꺾인 성문, 높은 망루(천수각)를 갖추어 공격하기 매우 어려웠다.',
    facts: ['울산·서생포·부산·김해·사천·순천 등 남해안에 수십 곳이 쌓였다.', '1597~1598년 조·명 연합군은 울산·사천·순천의 왜성을 공격했지만 하나도 함락하지 못했다.', '지금도 여러 곳에 성터와 돌담이 남아 있다.'] },
];

// 전투 부대 종류 → 도감 항목
function codexFor(u, naval) {
  if (u.t === 'turtle') return 'geobukseon';
  if (u.t === 'ship' || (naval && u.t === 'flag')) {
    if (u.f === 'japan') return u.t === 'flag' ? 'atakebune' : 'sekibune';
    if (u.f === 'ming') return 'mingship';
    return 'panokseon';
  }
  if (u.t === 'arq' && u.f === 'japan') return 'jochong';
  if (u.t === 'gun') return u.f === 'ming' ? 'bullanggi' : u.f === 'joseon' ? (u.n.includes('비격') ? 'bigyeok' : u.n.includes('화차') ? 'singijeon' : 'chongtong') : null;
  if (u.t === 'castle') return u.f === 'japan' && /왜성|왜교성|신채/.test(u.n) ? 'waeseong' : u.n.includes('산성') ? 'sanseong' : 'eupseong';
  return null;
}

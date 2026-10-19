// 과거 추정 지형: OSM 지도에서 물(바다·강)만 추출해 고지도풍으로 다시 칠하고,
// 지형 음영(Hillshade)을 겹친 뒤 전투별 복원 요소(옛 해안선, 성곽, 논·습지, 옛길)를 올린다.
const Terrain = (() => {
  const WATER = [134, 168, 170];
  const LAND = [233, 221, 193];
  const OSM_WATER = [170, 211, 223];

  // OSM 타일 → 물/땅 두 색으로 단순화. 다리·항로선·물 위 글자 같은 얇은 요소는 주변 다수결로 지운다.
  const PastTiles = L.GridLayer.extend({
    createTile(c, done) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, 256, 256), p = d.data;
        const N = 256, mask = new Uint8Array(N * N);
        for (let i = 0; i < N * N; i++) {
          const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
          mask[i] = Math.abs(r - OSM_WATER[0]) + Math.abs(g - OSM_WATER[1]) + Math.abs(b - OSM_WATER[2]) < 36 ? 1 : 0;
        }
        // 합계 영역 테이블로 9×9 이웃의 물 비율 계산
        const S = new Uint32Array((N + 1) * (N + 1));
        for (let y = 0; y < N; y++) {
          let row = 0;
          for (let x = 0; x < N; x++) {
            row += mask[y * N + x];
            S[(y + 1) * (N + 1) + x + 1] = S[y * (N + 1) + x + 1] + row;
          }
        }
        const R = 4;
        for (let y = 0; y < N; y++) {
          const y0 = Math.max(0, y - R), y1 = Math.min(N, y + R + 1);
          for (let x = 0; x < N; x++) {
            const x0 = Math.max(0, x - R), x1 = Math.min(N, x + R + 1);
            const sum = S[y1 * (N + 1) + x1] - S[y0 * (N + 1) + x1] - S[y1 * (N + 1) + x0] + S[y0 * (N + 1) + x0];
            const ratio = sum / ((y1 - y0) * (x1 - x0));
            const i = y * N + x;
            const w = mask[i] ? ratio > 0.2 : ratio >= 0.55;
            const col = w ? WATER : LAND;
            p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]; p[i * 4 + 3] = 255;
          }
        }
        ctx.putImageData(d, 0, 0);
        done(null, cv);
      };
      img.onerror = () => done(null, cv);
      img.src = `https://tile.openstreetmap.org/${c.z}/${c.x}/${c.y}.png`;
      return cv;
    },
  });

  function makeBase(pane) {
    return L.layerGroup([
      new PastTiles({ pane, maxZoom: 19, maxNativeZoom: 18, attribution: '&copy; OpenStreetMap contributors' }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
        pane, maxZoom: 19, maxNativeZoom: 16, className: 'hillshade', attribution: 'Hillshade &copy; Esri',
      }),
    ]);
  }

  let map, data, mode = 'now', base, feats, divider, dividerX = 0.5;

  function init(theMap) {
    map = theMap;
    for (const [name, z] of [['pastBase', 250], ['pastFeat', 380]]) {
      map.createPane(name).style.zIndex = z;
    }
    map.getPane('pastFeat').style.pointerEvents = 'none';
    base = makeBase('pastBase');
    feats = L.layerGroup();
    divider = document.createElement('div');
    divider.className = 'terrain-divider hidden';
    divider.innerHTML = '<span>◀ 1590년대 추정 · 현재 ▶</span>';
    map.getContainer().appendChild(divider);
    L.DomEvent.disableClickPropagation(divider);
    let drag = false;
    divider.addEventListener('pointerdown', (e) => { drag = true; divider.setPointerCapture(e.pointerId); map.dragging.disable(); });
    divider.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = map.getContainer().getBoundingClientRect();
      dividerX = Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width));
      updateClip();
    });
    divider.addEventListener('pointerup', () => { drag = false; map.dragging.enable(); });
    map.on('move zoom resize', updateClip);
  }

  function buildFeatures() {
    feats.clearLayers();
    if (!data) return;
    const pane = 'pastFeat';
    for (const poly of data.water || []) {
      L.polygon(poly, { pane, stroke: true, color: '#4f7b80', weight: 1.5, dashArray: '5 4', fillColor: `rgb(${WATER})`, fillOpacity: 1, interactive: false }).addTo(feats);
    }
    for (const r of data.rivers || []) {
      L.polyline(r.pts, { pane, color: `rgb(${WATER})`, weight: r.w || 6, opacity: 1, lineCap: 'round', interactive: false }).addTo(feats);
    }
    for (const poly of data.fields || []) {
      L.polygon(poly, { pane, color: '#7d7a3c', weight: 1.2, dashArray: '3 4', fillColor: '#a9a560', fillOpacity: 0.32, interactive: false }).addTo(feats);
    }
    for (const rd of data.roads || []) {
      L.polyline(rd, { pane, color: '#8a5a2b', weight: 2.5, dashArray: '7 6', opacity: 0.85, interactive: false }).addTo(feats);
    }
    for (const w of data.walls || []) {
      L.polygon(w.pts, { pane, color: '#5b3a1e', weight: 4, fill: true, fillColor: '#5b3a1e', fillOpacity: 0.06, interactive: false }).addTo(feats);
    }
    for (const [la, ln, text] of data.labels || []) {
      L.marker([la, ln], { pane, interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="past-label">${text}</div>` }) }).addTo(feats);
    }
  }

  function updateClip() {
    const bp = map.getPane('pastBase'), fp = map.getPane('pastFeat');
    if (mode !== 'compare') { bp.style.clip = fp.style.clip = ''; return; }
    const size = map.getSize();
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(size);
    const cx = nw.x + size.x * dividerX;
    bp.style.clip = fp.style.clip = `rect(${nw.y}px, ${cx}px, ${se.y}px, ${nw.x}px)`;
    divider.style.left = `${dividerX * 100}%`;
  }

  function setMode(m) {
    mode = m;
    const on = m !== 'now';
    if (on) { base.addTo(map); feats.addTo(map); } else { map.removeLayer(base); map.removeLayer(feats); }
    divider.classList.toggle('hidden', m !== 'compare');
    document.querySelectorAll('#terrainSwitch button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    document.getElementById('terrainLegend').classList.toggle('hidden', !on);
    updateClip();
  }

  // 전투 화면에 들어갈 때 호출
  function show(terrainData) {
    data = terrainData || null;
    buildFeatures();
    document.getElementById('terrainSwitch').classList.remove('hidden');
    setMode(mode);
  }

  function hide() {
    map.removeLayer(base);
    map.removeLayer(feats);
    divider.classList.add('hidden');
    document.getElementById('terrainSwitch').classList.add('hidden');
    document.getElementById('terrainLegend').classList.add('hidden');
    const bp = map.getPane('pastBase'), fp = map.getPane('pastFeat');
    bp.style.clip = fp.style.clip = '';
  }

  return { init, show, hide, setMode, makeBase };
})();

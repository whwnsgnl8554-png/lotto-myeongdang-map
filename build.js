/**
 * 로또 명당 지도 빌드 스크립트
 * 1) 당첨판매점 데이터(stores.json) 다운로드
 * 2) 판매점별로 집계
 * 3) 결과물 두 가지 생성
 *    - dist/index.html   : 앱인토스에 올리는 앱 (데이터 내장 + 실행 시 최신 데이터 확인)
 *    - public/data.json  : GitHub Pages로 배포되는 최신 데이터 (매주 자동 갱신)
 *
 * 사용법: npm install && npm run build
 * 옵션:   node build.js --local stores.json   (다운로드 대신 로컬 파일 사용)
 * 환경변수: DATA_URL  앱이 불러올 data.json 주소 (기본값은 config.json의 dataUrl)
 */
const fs = require('fs');
const path = require('path');

const SRC_URL = 'https://raw.githubusercontent.com/uriseozz/lotto-data/main/stores.json';
const OUT_DIR = path.join(__dirname, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'index.html');
const PUB_DIR = path.join(__dirname, 'public');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const DATA_URL = process.env.DATA_URL || CONFIG.dataUrl || '';
const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];
const GWANGJU_GU = new Set(['동구','서구','남구','북구','광산구']);

async function loadRaw() {
  const i = process.argv.indexOf('--local');
  if (i > -1) {
    console.log('로컬 파일 사용:', process.argv[i + 1]);
    return JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  }
  console.log('다운로드 중:', SRC_URL);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(SRC_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      console.warn(`  시도 ${attempt} 실패: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
}

async function publishedLatest() {
  if (!DATA_URL) return null;
  const url = DATA_URL.replace(/data\.json(\?.*)?$/, 'version.json');
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null; // 첫 배포 등
    return (await res.json()).latest ?? null;
  } catch { return null; }
}

function normalizeRegion(region, gugun) {
  // 광주·전남 통합 표기('전남광주')를 기존 시도로 되돌림
  if (region === '전남광주') return GWANGJU_GU.has(gugun) ? '광주' : '전남';
  return region;
}

function aggregate(raw) {
  const map = new Map();
  for (const r of raw.stores) {
    const name = (r.name || '이름 미상').trim();
    if (r.lat == null || r.lot == null) continue;
    if (name.includes('인터넷') || name.includes('dhlottery')) continue; // 온라인 판매분 제외

    let s = map.get(r.shop_id);
    if (!s) { s = { w1: [], w2: 0, a: 0, m: 0, sa: 0, last: 0 }; map.set(r.shop_id, s); }
    // 최신 기록으로 이름·주소·좌표 갱신 (이전/상호변경 반영)
    s.n = name;
    s.g = r.gugun || '';
    s.r = normalizeRegion(r.region, s.g);
    let addr = (r.addr || '').trim();
    if (addr.startsWith('전남광주 ')) addr = s.r + addr.slice(4);
    s.ad = addr;
    s.lat = Math.round(r.lat * 1e5) / 1e5;
    s.lng = Math.round(r.lot * 1e5) / 1e5;

    if (r.rank === 1) {
      s.w1.push(r.round);
      if (r.method === '자동') s.a++;
      else if (r.method === '수동') s.m++;
      else if (r.method === '반자동') s.sa++;
    } else {
      s.w2++;
    }
    s.last = Math.max(s.last, r.round);
  }

  const out = [];
  let skipped = 0;
  for (const s of map.values()) {
    const ri = REGIONS.indexOf(s.r);
    if (ri < 0) { skipped++; continue; }
    out.push([s.n, s.ad, ri, s.g, s.lat, s.lng, s.w2, s.a, s.m, s.sa, s.last, s.w1.sort((x, y) => x - y)]);
  }
  out.sort((x, y) => y[11].length - x[11].length || y[6] - x[6]);
  if (skipped) console.warn(`  시도 인식 실패로 제외: ${skipped}곳`);
  return out;
}

async function main() {
  const raw = await loadRaw();
  if (!raw || !Array.isArray(raw.stores) || !raw.stores.length) throw new Error('데이터 형식이 예상과 달라요 (stores 배열 없음)');

  const shops = aggregate(raw);
  const data = { latest: raw.latest, updated: raw.updated_at, start: raw.start, regions: REGIONS, s: shops };
  const firstCount = shops.filter(s => s[11].length).length;
  console.log(`회차 ${raw.start}~${raw.latest} / 판매점 ${shops.length.toLocaleString()}곳 (1등 배출 ${firstCount.toLocaleString()}곳)`);

  // 지금 배포돼 있는 데이터보다 회차가 줄었으면 중단 (데이터 소스 이상 방지)
  const prevLatest = await publishedLatest();
  if (prevLatest != null) {
    if (raw.latest < prevLatest) throw new Error(`최신 회차가 배포된 데이터(${prevLatest}회)보다 작아요: ${raw.latest}회`);
    console.log(raw.latest === prevLatest ? '  새 회차 없음 (같은 회차로 다시 빌드)' : `  ${prevLatest}회 → ${raw.latest}회`);
  }

  const leafletDir = path.dirname(require.resolve('leaflet/package.json'));
  const leafletCss = fs.readFileSync(path.join(leafletDir, 'dist/leaflet.css'), 'utf8');
  const leafletJs = fs.readFileSync(path.join(leafletDir, 'dist/leaflet.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');

  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  for (const key of ['/*LEAFLET_CSS*/', '/*LEAFLET_JS*/', '/*DATA*/', '/*DATA_URL*/', '/*TILES*/']) {
    if (!html.includes(key)) throw new Error('template.html에 자리표시자가 없어요: ' + key);
  }
  // replace에 함수를 넘겨 '$&' 같은 특수 패턴이 치환되지 않게 함
  html = html.replace('/*LEAFLET_CSS*/', () => leafletCss)
             .replace('/*LEAFLET_JS*/', () => leafletJs)
             .replace('/*DATA*/', () => json);

  html = html.replace('/*DATA_URL*/', () => JSON.stringify(DATA_URL));
  const tiles = (CONFIG.tiles || []).filter(x => x && x.url && !x.url.includes('YOUR_KEY'));
  if (!tiles.length) throw new Error('config.json에 쓸 수 있는 지도 타일(tiles)이 없어요');
  html = html.replace('/*TILES*/', () => JSON.stringify(tiles));
  console.log('지도 타일:', tiles.map(x => x.name || x.url).join(' → '));
  const version = JSON.stringify({ latest: raw.latest, updated: raw.updated_at, shops: shops.length, builtAt: new Date().toISOString() }, null, 2);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  fs.writeFileSync(path.join(OUT_DIR, 'version.json'), version);

  fs.mkdirSync(PUB_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUB_DIR, 'data.json'), JSON.stringify(data));
  fs.writeFileSync(path.join(PUB_DIR, 'version.json'), version);
  fs.writeFileSync(path.join(PUB_DIR, 'index.html'), html); // 브라우저로 바로 확인용

  console.log(`완료: dist/index.html (${(Buffer.byteLength(html) / 1e6).toFixed(2)}MB), public/data.json`);
  console.log(`앱이 불러올 데이터 주소: ${DATA_URL || '(없음 — 내장 데이터만 사용)'}`);
}

main().catch(e => { console.error('빌드 실패:', e.message); process.exit(1); });

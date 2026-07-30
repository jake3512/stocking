/* =========================================================
   모의 주식투자 - 시장 엔진 + UI
   Firebase Realtime Database로 모든 유저가 같은 시장을 공유합니다.
   ========================================================= */

const db = firebase.database();
const auth = firebase.auth();

// ---------- 종목/기업 데이터 ----------
const SECTOR_LABEL = {
  tech: "테크", ent: "엔터", bio: "바이오",
  food: "식품", const: "건설", chem: "화학"
};

const SECTORS = {
  tech: [
    { id: "tech1", name: "나노테크", cap: 10000000000 },
    { id: "tech2", name: "놀로지아테크", cap: 1000000000 },
    { id: "tech3", name: "티크테크", cap: 100000000 }
  ],
  ent: [
    { id: "ent1", name: "쉬프트엔터", cap: 10000000000 },
    { id: "ent2", name: "컨트롤v엔터", cap: 1000000000 },
    { id: "ent3", name: "/kill엔터", cap: 100000000 }
  ],
  bio: [
    { id: "bio1", name: "프로바이오", cap: 10000000000 },
    { id: "bio2", name: "정글바이오", cap: 1000000000 },
    { id: "bio3", name: "바이바이오", cap: 100000000 }
  ],
  food: [
    { id: "food1", name: "시후식품", cap: 10000000000 },
    { id: "food2", name: "sihoomonster식품", cap: 1000000000 },
    { id: "food3", name: "먹고식품", cap: 100000000 }
  ],
  const: [
    { id: "const1", name: "랜드마크건설", cap: 10000000000 },
    { id: "const2", name: "레건설", cap: 1000000000 },
    { id: "const3", name: "고건설", cap: 100000000 }
  ],
  chem: [
    { id: "chem1", name: "우화학", cap: 10000000000 },
    { id: "chem2", name: "기화학", cap: 1000000000 },
    { id: "chem3", name: "오리화학", cap: 100000000 }
  ]
};

const INITIAL_LISTED_SHARES = 10000;
const LISTED_SHARES_UPGRADE = 100000;
const LISTED_SHARES_PRICE_TRIGGER = 2000000;
const INITIAL_CASH = 500000;

// ---------- 이벤트 템플릿 ----------
// 기업별 이슈 (전체 18개 기업 중 무작위 1곳) - 변동폭 대폭 상향
const COMPANY_TEMPLATES = [
  { text: n => `${n} 오너일가 갑질 논란`, pct: -9 },
  { text: n => `${n}, 아동단체에 기부`, pct: 6 },
  { text: n => `${n}, 오늘의 기업 선정`, pct: 9 },
  { text: n => `${n} 내부 비리 고발`, pct: -6 }
];

// 종목별 이슈 (해당 종목 내 무작위 1개 기업에 적용) - 변동폭 대폭 상향
const SECTOR_TEMPLATES = {
  tech: [
    { text: n => `${n} 생산 공장에 화재`, pct: -6 },
    { text: n => `${n} 산업 스파이로 기술 유출`, pct: -9 },
    { text: n => `${n} 신기술 개발`, pct: 9 },
    { text: n => `${n} 국가 지원 확대`, pct: 6 }
  ],
  ent: [
    { text: n => `${n} 소속 아이돌 멜론차트 1위`, pct: 9 },
    { text: n => `${n} 소속 아이돌 갑질 논란`, pct: -9 },
    { text: n => `${n} 소속 아이돌 충격 열애설`, pct: -6 },
    { text: n => `${n} 소속 아이돌 국가 홍보대사 선정`, pct: 6 }
  ],
  bio: [
    { text: n => `${n} 신약개발`, pct: 9 },
    { text: n => `${n} 약품서 인체 유해성분 검출`, pct: -6 },
    { text: n => `${n} 약품 부작용 발견`, pct: -9 },
    { text: n => `${n} 약품원료 가격 하락`, pct: 6 }
  ],
  food: [
    { text: n => `${n} 신제품 출시`, pct: 9 },
    { text: n => `${n} 인체 유해성분 발견`, pct: -6 },
    { text: n => `${n} 생산공장 위생 논란`, pct: -9 },
    { text: n => `${n} 제품 건강 효능 발견`, pct: 6 }
  ],
  const: [
    { text: n => `${n} 노동자 시위`, pct: -6 },
    { text: n => `${n} 건물 완공`, pct: 6 },
    { text: n => `${n} 국가 건물 건설 추진`, pct: 9 },
    { text: n => `${n} 건설 현장서 인명사고`, pct: -9 }
  ],
  chem: [
    { text: n => `${n} 신소재 개발`, pct: 9 },
    { text: n => `${n} 생산 공장서 인체 유해물질 대량 유출`, pct: -9 },
    { text: n => `${n} 생산 공장서 화재`, pct: -6 },
    { text: n => `${n} 국가 지원 확대`, pct: 6 }
  ]
};

// 글로벌 이슈 (전체 기업에 동일 적용) - 영향력을 기업/종목 이슈보다 더 크게
const GLOBAL_TEMPLATES = [
  { text: "전염병 팬데믹 발생", pct: -15 },
  { text: "역대급 경제 호황", pct: 15 },
  { text: "중동서 전쟁 발생", pct: -12 },
  { text: "트럼프 관세 낮추겠다 발표", pct: 8 }
];

// 업/다운 방향별로 미리 나눠서, 특정 방향으로 확률을 쏠리게 뽑을 때 사용
const COMPANY_UP_TEMPLATES = COMPANY_TEMPLATES.filter(t => t.pct > 0);
const COMPANY_DOWN_TEMPLATES = COMPANY_TEMPLATES.filter(t => t.pct < 0);
const SECTOR_TEMPLATE_POOLS = {};
Object.keys(SECTOR_TEMPLATES).forEach(sec => {
  SECTOR_TEMPLATE_POOLS[sec] = {
    up: SECTOR_TEMPLATES[sec].filter(t => t.pct > 0),
    down: SECTOR_TEMPLATES[sec].filter(t => t.pct < 0)
  };
});

// 트렌드 뉴스 (해당 종목 전 종목에 동일 적용, 1분마다 30% 확률/3분 쿨타임)
const TREND_TEMPLATES = [
  { sector: "ent", text: "K-POP 열풍", pct: 10 },
  { sector: "food", text: "한식 열풍", pct: 10 },
  { sector: "tech", text: "K-반도체 각광", pct: 10 },
  { sector: "chem", text: "중국 신소재공장 부도", pct: 10 },
  { sector: "const", text: "두바이서 빌딩 건설 의뢰 건", pct: 10 },
  { sector: "bio", text: "한국서 신종 바이러스 백신 개발", pct: 10 }
];

// ---------- 장세(정세) 시스템: 7시간마다 전환, 유저에게는 숨겨짐 ----------
const REGIME_INTERVAL = 7 * 60 * 60 * 1000;
const REGIME_INFO = {
  boom_big: { label: "대호황", downMultiplier: 0.8, upMultiplier: 1 },   // 하락률 대폭 감소(완화됨)
  boom: { label: "호황", downMultiplier: 0.97, upMultiplier: 1 },        // 하락률 소폭 감소(완화됨)
  bust: { label: "불황", downMultiplier: 1, upMultiplier: 0.97 },        // 상승률 소폭 감소(완화됨)
  bust_big: { label: "대불황", downMultiplier: 1, upMultiplier: 0.8 }    // 상승률 대폭 감소(완화됨)
};
function pickRegimeType() {
  const r = Math.random();
  if (r < 0.05) return "boom_big";       // 대호황 5%
  if (r < 0.10) return "bust_big";       // 대불황 5%
  if (r < 0.55) return "boom";           // 호황 45%
  return "bust";                          // 불황 45%
}

const ALL_COMPANIES = Object.keys(SECTORS).flatMap(sec =>
  SECTORS[sec].map(c => ({ ...c, sector: sec }))
);

// ---------- 유틸 ----------
function randInt(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[randInt(arr.length)]; }
function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }

function getKSTHour() {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", hour: "2-digit", hour12: false
  }).format(new Date());
  return parseInt(s, 10) % 24;
}
function isMarketOpen() {
  const h = getKSTHour();
  return h >= 9; // 09:00 ~ 23:59
}

// 평균 0, -3~+3 사이에서 ±1% 근방일 확률이 더 높은 분포(삼각분포형)
function randomWalkPercent() {
  let r = 0;
  for (let i = 0; i < 3; i++) r += (Math.random() * 2 - 1);
  return r; // 범위 -3 ~ 3, 0 부근 밀도가 더 높음
}

// 현재 장세(정세)에 따라 상승/하락폭을 보정 (정세 자체는 유저에게 노출하지 않음)
let regimeCache = { up: 1, down: 1 };
function adjustForRegime(pct) {
  if (pct === 0) return 0;
  return pct > 0 ? pct * regimeCache.up : pct * regimeCache.down;
}

// ---------- 분산 락 (여러 브라우저가 동시에 열려 있어도 한 번만 실행) ----------
async function claim(path, intervalMs) {
  const res = await db.ref(path).transaction(current => {
    const now = Date.now();
    if (current && now - current < intervalMs) return; // 아직 시간 안 됨 -> 중단
    return now;
  });
  return res.committed;
}

// ---------- 뉴스 ----------
async function pushNews(text) {
  await db.ref("news").push({ text, time: Date.now() });
  if (Math.random() < 0.05) trimNews();
}
async function trimNews() {
  const snap = await db.ref("news").orderByChild("time").once("value");
  const keys = [];
  snap.forEach(child => keys.push(child.key));
  if (keys.length > 500) {
    const toRemove = keys.slice(0, keys.length - 500);
    const updates = {};
    toRemove.forEach(k => (updates[k] = null));
    db.ref("news").update(updates);
  }
}

// ---------- 시장 시딩 (최초 1회) ----------
async function seedMarketIfNeeded() {
  const snap = await db.ref("market/stocks").once("value");
  if (snap.exists()) return;
  const stocks = {};
  ALL_COMPANIES.forEach(c => {
    stocks[c.id] = {
      name: c.name,
      sector: c.sector,
      price: Math.round(c.cap / INITIAL_LISTED_SHARES),
      listedShares: INITIAL_LISTED_SHARES
    };
  });
  await db.ref("market/stocks").set(stocks);
  await db.ref("market/meta").set({
    lastPriceUpdate: 0,
    lastNewsEvent: 0,
    lastHistorySample: 0,
    lastTrendCheck: 0,
    lastVolumeCheck: 0,
    lastOrderCheck: 0,
    priceTickCount: 0,
    globalCooldownUntil: 0,
    trendCooldownUntil: 0,
    tradingDate: todayStrKST(),
    regime: pickRegimeType(),       // 최초 장세는 조용히 설정 (공지 없음)
    regimeChangedAt: Date.now()
  });
  const dayOpen = {};
  const priceHistory = {};
  for (const id in stocks) {
    dayOpen[id] = stocks[id].price;
    priceHistory[id] = [stocks[id].price]; // 당일 시가로 그래프 시작점 기록
  }
  await db.ref("market/dayOpen").set(dayOpen);
  await db.ref("market/priceHistory").set(priceHistory);
}

// ---------- 당일 시가(증감률/그래프 기준) 관리 ----------
function todayStrKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 날짜가 바뀌면(장 시작 시점) 그날의 시가와 그래프 기록을 새로 시작 (여러 브라우저 중 하나만 실행)
async function ensureTradingDay() {
  const today = todayStrKST();
  const res = await db.ref("market/meta/tradingDate").transaction(current => {
    if (current === today) return; // 이미 오늘 날짜로 세팅됨 -> 중단
    return today;
  });
  if (!res.committed) return;
  const snap = await db.ref("market/stocks").once("value");
  const stocks = snap.val() || {};
  const dayOpen = {};
  const priceHistory = {};
  for (const id in stocks) {
    dayOpen[id] = stocks[id].price;
    priceHistory[id] = [stocks[id].price]; // 당일 시가로 그래프 리셋
  }
  await db.ref("market/dayOpen").set(dayOpen);
  await db.ref("market/priceHistory").set(priceHistory);
}

// ---------- 장세(정세) 전환 (7시간마다, 유저에게는 완전히 숨김 - 공지 없음) ----------
async function ensureRegime() {
  const now = Date.now();
  const res = await db.ref("market/meta/regimeChangedAt").transaction(current => {
    if (current && now - current < REGIME_INTERVAL) return; // 아직 7시간 안 지남 -> 중단
    return now;
  });
  if (!res.committed) return; // 이번엔 이 브라우저 담당이 아님
  const newType = pickRegimeType();
  await db.ref("market/meta/regime").set(newType);
  // 정세 전환은 유저에게 알리지 않음 (뉴스 공지 없이 조용히 적용)
}

// ---------- 당일 그래프용 시세 샘플링 (1분마다 저장, 최대 HISTORY_MAX_POINTS개 유지) ----------
const HISTORY_SAMPLE_INTERVAL = 60000; // 1분
const HISTORY_MAX_POINTS = 1000; // 하루(09:00~23:59)를 1분 간격으로 커버하기 충분한 여유치

async function tickHistorySample() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastHistorySample", HISTORY_SAMPLE_INTERVAL);
  if (!ok) return;
  const snap = await db.ref("market/stocks").once("value");
  const stocks = snap.val();
  if (!stocks) return;
  for (const id in stocks) {
    const price = stocks[id].price;
    db.ref("market/priceHistory/" + id).transaction(arr => {
      arr = arr || [];
      arr.push(price);
      if (arr.length > HISTORY_MAX_POINTS) arr = arr.slice(arr.length - HISTORY_MAX_POINTS);
      return arr;
    });
  }
}

// ---------- 개별 종목에 이벤트 적용 (연속 동일방향 뉴스일수록 변동폭 확대, 최대 ±10%) ----------
const STREAK_MAX = 3;
const STREAK_CAP_PCT = 10; // 3연속 시 최대 변동폭
const STREAK_STEP2_PCT = 8; // 2연속째 최소 변동폭

async function applyEventToStock(id, basePct) {
  const dir = basePct > 0 ? "up" : "down";

  // 이 종목에 대한 "같은 방향" 연속 뉴스 횟수를 집계 (최대 3까지, 모든 유저가 공유)
  let streakCount = 1;
  await db.ref("market/streaks/" + id).transaction(s => {
    if (!s || s.dir !== dir) {
      streakCount = 1;
      return { dir, count: 1 };
    }
    streakCount = Math.min(STREAK_MAX, (s.count || 1) + 1);
    return { dir, count: streakCount };
  });

  let effectiveAbs = Math.abs(basePct);
  if (streakCount === 2) effectiveAbs = Math.max(effectiveAbs, STREAK_STEP2_PCT);
  if (streakCount >= STREAK_MAX) effectiveAbs = STREAK_CAP_PCT;
  const rawPct = dir === "up" ? effectiveAbs : -effectiveAbs;
  const effectivePct = adjustForRegime(rawPct); // 현재 장세(정세)에 따라 최종 보정

  const ref = db.ref("market/stocks/" + id);
  await ref.transaction(s => {
    if (!s) return s;
    s.price = Math.max(1, Math.round(s.price * (1 + effectivePct / 100)));
    if (s.price > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      s.listedShares = LISTED_SHARES_UPGRADE;
    }
    return s;
  });

  return { effectivePct, streakCount };
}

function newsSuffix(effectivePct, streakCount) {
  if (streakCount < 2) return "";
  const word = effectivePct > 0 ? "연속 급등" : "연속 급락";
  return ` 🔥${streakCount}회 ${word}`;
}

// 현재 시가총액이 초기 설정값의 30% 미만이면 상승 확률을 2배로 (기본 50% -> 약 67%)
function pickDirection(initialCap, liveStock) {
  const curCap = liveStock.price * liveStock.listedShares;
  const isUndervalued = curCap < initialCap * 0.3;
  const upProb = isUndervalued ? (2 / 3) : 0.5;
  return Math.random() < upProb ? "up" : "down";
}

// ---------- 시세 갱신 (5초마다, 장 시간에만) ----------
async function tickPriceUpdate() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastPriceUpdate", 5000);
  if (!ok) return;
  const snap = await db.ref("market/stocks").once("value");
  const stocks = snap.val();
  if (!stocks) return;
  const updates = {};
  for (const id in stocks) {
    const s = stocks[id];
    const pct = adjustForRegime(randomWalkPercent());
    const newPrice = Math.max(1, Math.round(s.price * (1 + pct / 100)));
    updates[id + "/price"] = newPrice;
    if (newPrice > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      updates[id + "/listedShares"] = LISTED_SHARES_UPGRADE;
    }
  }
  await db.ref("market/stocks").update(updates);
  db.ref("market/meta/priceTickCount").transaction(c => (c || 0) + 1);
}

// ---------- 기업별 이슈 ----------
async function fireCompanyEvent() {
  const company = pick(ALL_COMPANIES);
  const snap = await db.ref("market/stocks/" + company.id).once("value");
  const liveStock = snap.val();
  if (!liveStock) return;
  const dir = pickDirection(company.cap, liveStock);
  const tmpl = pick(dir === "up" ? COMPANY_UP_TEMPLATES : COMPANY_DOWN_TEMPLATES);
  const { effectivePct, streakCount } = await applyEventToStock(company.id, tmpl.pct);
  await pushNews(`[기업] ${tmpl.text(company.name)} (${effectivePct > 0 ? "+" : ""}${effectivePct.toFixed(1)}%${newsSuffix(effectivePct, streakCount)})`);
}

// ---------- 종목별 이슈 ----------
async function fireSectorEvent() {
  const sectorKey = pick(Object.keys(SECTORS));
  const company = pick(SECTORS[sectorKey]);
  const snap = await db.ref("market/stocks/" + company.id).once("value");
  const liveStock = snap.val();
  if (!liveStock) return;
  const dir = pickDirection(company.cap, liveStock);
  const pool = SECTOR_TEMPLATE_POOLS[sectorKey][dir];
  const tmpl = pick(pool);
  const { effectivePct, streakCount } = await applyEventToStock(company.id, tmpl.pct);
  await pushNews(`[${SECTOR_LABEL[sectorKey]}] ${tmpl.text(company.name)} (${effectivePct > 0 ? "+" : ""}${effectivePct.toFixed(1)}%${newsSuffix(effectivePct, streakCount)})`);
}

// ---------- 글로벌 이슈 (30% 확률, 5분 쿨타임 - 영향력을 가장 크게) ----------
async function fireGlobalEvent() {
  const cdSnap = await db.ref("market/meta/globalCooldownUntil").once("value");
  const cooldownUntil = cdSnap.val() || 0;
  if (Date.now() < cooldownUntil) return;
  if (Math.random() >= 0.3) return;

  const tmpl = pick(GLOBAL_TEMPLATES);
  const adjPct = adjustForRegime(tmpl.pct);
  const snap = await db.ref("market/stocks").once("value");
  const stocks = snap.val();
  if (!stocks) return;
  const updates = {};
  for (const id in stocks) {
    const s = stocks[id];
    const newPrice = Math.max(1, Math.round(s.price * (1 + adjPct / 100)));
    updates[id + "/price"] = newPrice;
    if (newPrice > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      updates[id + "/listedShares"] = LISTED_SHARES_UPGRADE;
    }
  }
  await db.ref("market/stocks").update(updates);
  await db.ref("market/meta/globalCooldownUntil").set(Date.now() + 5 * 60000);
  await pushNews(`🌍 [글로벌] ${tmpl.text} (전체 ${adjPct > 0 ? "+" : ""}${adjPct.toFixed(1)}%)`);
}

// ---------- 트렌드 뉴스 (해당 종목 전 종목에 동일 적용, 1분마다 30% 확률, 3분 쿨타임) ----------
async function fireTrendEvent() {
  const tmpl = pick(TREND_TEMPLATES);
  const adjPct = adjustForRegime(tmpl.pct);
  const companies = SECTORS[tmpl.sector];
  for (const c of companies) {
    await db.ref("market/stocks/" + c.id).transaction(s => {
      if (!s) return s;
      s.price = Math.max(1, Math.round(s.price * (1 + adjPct / 100)));
      if (s.price > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
        s.listedShares = LISTED_SHARES_UPGRADE;
      }
      return s;
    });
  }
  await pushNews(`🔥 [트렌드] ${tmpl.text} (${SECTOR_LABEL[tmpl.sector]} 전종목 ${adjPct > 0 ? "+" : ""}${adjPct.toFixed(1)}%)`);
}

async function tickTrendEvent() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastTrendCheck", 60000);
  if (!ok) return;
  const cdSnap = await db.ref("market/meta/trendCooldownUntil").once("value");
  const cooldownUntil = cdSnap.val() || 0;
  if (Date.now() < cooldownUntil) return;
  if (Math.random() >= 0.3) return;
  await fireTrendEvent();
  await db.ref("market/meta/trendCooldownUntil").set(Date.now() + 3 * 60000);
}

// ---------- 거래량(매수/매도) 기반 가격 충격 ----------
// 같은 종목에 10분 내 매수량 100주 이상이 몰리면 +7%, 매도량 100주 이상이면 -7%
const VOLUME_WINDOW_MS = 10 * 60 * 1000;
const VOLUME_THRESHOLD = 100;
const VOLUME_IMPACT_PCT = 7;

async function recordTradeVolume(id, side, qty) {
  const field = side === "buy" ? "buyQty" : "sellQty";
  await db.ref("market/volume/" + id).transaction(v => {
    const now = Date.now();
    if (!v || now - (v.windowStart || 0) > VOLUME_WINDOW_MS) {
      v = { buyQty: 0, sellQty: 0, windowStart: now };
    }
    v[field] = (v[field] || 0) + qty;
    return v;
  });
}

async function tickVolumeImpact() {
  const ok = await claim("market/meta/lastVolumeCheck", 3000);
  if (!ok) return;
  const snap = await db.ref("market/volume").once("value");
  const volumes = snap.val() || {};
  for (const id in volumes) {
    const v = volumes[id];
    if (!v) continue;
    if ((v.buyQty || 0) >= VOLUME_THRESHOLD) {
      await applyVolumeImpact(id, VOLUME_IMPACT_PCT, "매수세 급증");
      await db.ref("market/volume/" + id).update({ buyQty: 0 });
    } else if ((v.sellQty || 0) >= VOLUME_THRESHOLD) {
      await applyVolumeImpact(id, -VOLUME_IMPACT_PCT, "매도세 급증");
      await db.ref("market/volume/" + id).update({ sellQty: 0 });
    }
  }
}

async function applyVolumeImpact(id, basePct, label) {
  const adjPct = adjustForRegime(basePct);
  const ref = db.ref("market/stocks/" + id);
  await ref.transaction(s => {
    if (!s) return s;
    s.price = Math.max(1, Math.round(s.price * (1 + adjPct / 100)));
    if (s.price > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      s.listedShares = LISTED_SHARES_UPGRADE;
    }
    return s;
  });
  const snap = await ref.once("value");
  const name = snap.val() ? snap.val().name : "";
  await pushNews(`📊 [거래량] ${name} ${label} (${adjPct > 0 ? "+" : ""}${adjPct.toFixed(1)}%)`);
}

// ---------- 예약주문(지정가 매수/매도) 체결 엔진 ----------
// 주문을 넣은 시점 이후 가격이 4번 바뀌기 전까지는 체결 비교를 시작하지 않음
const ORDER_DELAY_TICKS = 4;

async function tryFillOrder(uid, orderId, order, currentPrice) {
  const ref = db.ref("users/" + uid);
  const res = await ref.transaction(u => {
    if (!u || !u.orders || !u.orders[orderId] || u.orders[orderId].status !== "pending") return; // 이미 처리됨/없음 -> 중단
    const ord = u.orders[orderId];
    if (ord.side === "buy") {
      const cost = currentPrice * ord.qty;
      if ((u.cash || 0) < cost) return; // 잔액 부족 -> 대기 유지 (다음 체크 때 재시도)
      u.cash = (u.cash || 0) - cost;
      u.holdings = u.holdings || {};
      const existing = normalizeHolding(u.holdings[ord.stockId], currentPrice);
      const newQty = existing.qty + ord.qty;
      const newAvgPrice = Math.round((existing.avgPrice * existing.qty + currentPrice * ord.qty) / newQty);
      u.holdings[ord.stockId] = { qty: newQty, avgPrice: newAvgPrice };
    } else {
      const existing = normalizeHolding(u.holdings && u.holdings[ord.stockId]);
      if (existing.qty < ord.qty) return; // 보유 부족 -> 대기 유지
      u.cash = (u.cash || 0) + currentPrice * ord.qty;
      const remain = existing.qty - ord.qty;
      u.holdings[ord.stockId] = remain > 0
        ? { qty: remain, avgPrice: existing.avgPrice }
        : { qty: 0, avgPrice: 0 };
    }
    u.orders[orderId].status = "filled";
    u.orders[orderId].filledPrice = currentPrice;
    u.orders[orderId].filledAt = Date.now();
    return u;
  });
  if (res.committed) recordTradeVolume(order.stockId, order.side, order.qty);
}

async function tickOrders() {
  const ok = await claim("market/meta/lastOrderCheck", 3000);
  if (!ok) return;
  const [usersSnap, stocksSnap, tickSnap] = await Promise.all([
    db.ref("users").once("value"),
    db.ref("market/stocks").once("value"),
    db.ref("market/meta/priceTickCount").once("value")
  ]);
  const users = usersSnap.val() || {};
  const stocks = stocksSnap.val() || {};
  const currentTick = tickSnap.val() || 0;

  for (const uid in users) {
    const orders = users[uid].orders;
    if (!orders) continue;
    for (const orderId in orders) {
      const order = orders[orderId];
      if (!order || order.status !== "pending") continue;
      if (currentTick - (order.createdTickCount || 0) < ORDER_DELAY_TICKS) continue; // 아직 4틱 안 지남
      const stock = stocks[order.stockId];
      if (!stock) continue;
      const price = stock.price;
      const matched = order.side === "buy" ? price <= order.limitPrice : price >= order.limitPrice;
      if (!matched) continue;
      await tryFillOrder(uid, orderId, order, price);
    }
  }
}

// ---------- 뉴스 통합 디스패처 (3초마다 하나씩) ----------
const NEWS_TICK_INTERVAL = 3000;

async function tickNewsEvent() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastNewsEvent", NEWS_TICK_INTERVAL);
  if (!ok) return;
  const roll = Math.random();
  if (roll < 0.12) {
    await fireGlobalEvent(); // 자체 쿨타임/확률 게이트를 통과해야 실제로 발생
  } else if (roll < 0.56) {
    await fireCompanyEvent();
  } else {
    await fireSectorEvent();
  }
}

function startMarketLoop() {
  setInterval(() => {
    ensureTradingDay();
    ensureRegime();
    tickPriceUpdate();
    tickHistorySample();
    tickNewsEvent();
    tickTrendEvent();
    tickVolumeImpact();
    tickOrders();
  }, 1000);
}

/* =========================================================
   유저 / 거래 / UI
   ========================================================= */

let currentUid = null;
let currentStocks = {};   // 최신 시세 캐시
let prevPrices = {};      // 직전 시세 (등락 색상용)
let currentUserData = { cash: 0, holdings: {} };
let selectedStockId = null;
let dayOpenCache = {};    // 당일 시가 (증감률 계산 기준)
let priceHistoryCache = {}; // 종목별 당일 가격 기록 (market/priceHistory, 모든 유저 공유)

// 보유 종목 데이터를 {qty, avgPrice} 형태로 정규화 (예전 숫자 형식도 호환)
function normalizeHolding(h, fallbackPrice) {
  if (h == null) return { qty: 0, avgPrice: 0 };
  if (typeof h === "number") return { qty: h, avgPrice: fallbackPrice || 0 };
  return { qty: h.qty || 0, avgPrice: h.avgPrice || 0 };
}

const els = {
  loginModal: document.getElementById("login-modal"),
  nicknameInput: document.getElementById("nickname-input"),
  loginBtn: document.getElementById("login-btn"),
  nickname: document.getElementById("nickname"),
  cash: document.getElementById("cash"),
  totalAssets: document.getElementById("total-assets"),
  ticker: document.getElementById("ticker"),
  marketBody: document.getElementById("market-body"),
  portfolioBody: document.getElementById("portfolio-body"),
  ordersList: document.getElementById("orders-list"),
  newsList: document.getElementById("news-list"),
  rankBody: document.getElementById("rank-body"),
  tradeModal: document.getElementById("trade-modal"),
  tradeStockName: document.getElementById("trade-stock-name"),
  tradePrice: document.getElementById("trade-price"),
  tradeLimitPrice: document.getElementById("trade-limit-price"),
  useMarketPriceBtn: document.getElementById("use-market-price-btn"),
  tradeQty: document.getElementById("trade-qty"),
  tradeOwned: document.getElementById("trade-owned"),
  tradeReturnRow: document.getElementById("trade-return-row"),
  tradeReturn: document.getElementById("trade-return"),
  tradeTotal: document.getElementById("trade-total"),
  buyBtn: document.getElementById("buy-btn"),
  sellBtn: document.getElementById("sell-btn"),
  closeTradeBtn: document.getElementById("close-trade-btn"),
  marketStatus: document.getElementById("market-status"),
  sortSelect: document.getElementById("sort-select"),
  pinOwnedToggle: document.getElementById("pin-owned-toggle")
};

function totalAssetsOf(userData) {
  let total = userData.cash || 0;
  const holdings = userData.holdings || {};
  for (const id in holdings) {
    const h = normalizeHolding(holdings[id]);
    const price = currentStocks[id] ? currentStocks[id].price : 0;
    total += price * h.qty;
  }
  return total;
}

// ---------- 로그인 (닉네임 + 익명 인증) ----------
els.loginBtn.addEventListener("click", doLogin);
els.nicknameInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

function doLogin() {
  const name = els.nicknameInput.value.trim();
  if (!name) { els.nicknameInput.focus(); return; }
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "입장 중...";
  localStorage.setItem("pendingNickname", name);
  auth.signInAnonymously().catch(err => {
    alert("로그인 실패: " + err.message);
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "모의투자 시작하기";
  });
}

auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUid = user.uid;
  const userRef = db.ref("users/" + currentUid);
  const snap = await userRef.once("value");

  if (!snap.exists()) {
    const pending = localStorage.getItem("pendingNickname");
    if (!pending) { els.loginModal.classList.remove("hidden"); return; }
    await userRef.set({
      nickname: pending,
      cash: INITIAL_CASH,
      holdings: {},
      joinedAt: Date.now()
    });
    localStorage.removeItem("pendingNickname");
  }

  els.loginModal.classList.add("hidden");
  await seedMarketIfNeeded();
  startMarketLoop();
  listenMarket();
  listenDayOpen();
  listenPriceHistory();
  listenRegime();
  listenUser();
  listenUsers();
  listenNews();
  setInterval(updateMarketStatus, 1000);
  updateMarketStatus();
});

// 최초 진입 시 이미 로그인 세션 없으면 모달 표시
setTimeout(() => {
  if (!currentUid) els.loginModal.classList.remove("hidden");
}, 800);

function updateMarketStatus() {
  const open = isMarketOpen();
  els.marketStatus.textContent = open ? "🟢 장중 (09:00-23:59)" : "🔴 장마감 (00:00-08:59)";
  els.marketStatus.className = open ? "market-status open" : "market-status closed";
}

// ---------- 시장 데이터 구독 ----------
function listenMarket() {
  db.ref("market/stocks").on("value", snap => {
    const stocks = snap.val() || {};
    prevPrices = currentStocks;
    currentStocks = stocks;
    renderMarket();
    renderPortfolio();
    renderTradeModal();
  });
}

function listenDayOpen() {
  db.ref("market/dayOpen").on("value", snap => {
    dayOpenCache = snap.val() || {};
    renderMarket();
  });
}

// 장세(정세)는 화면에 표시하지 않고, 등락률 보정 계산에만 내부적으로 사용
function listenRegime() {
  db.ref("market/meta/regime").on("value", snap => {
    const info = REGIME_INFO[snap.val()];
    regimeCache = info ? { up: info.upMultiplier, down: info.downMultiplier } : { up: 1, down: 1 };
  });
}

// 당일 시장 시작(09:00) 이후 쌓인 시세 기록 - 모든 유저가 같은 그래프를 봄
function listenPriceHistory() {
  db.ref("market/priceHistory").on("value", snap => {
    priceHistoryCache = snap.val() || {};
    renderMarket();
  });
}

function listenUser() {
  db.ref("users/" + currentUid).on("value", snap => {
    currentUserData = snap.val() || { cash: 0, holdings: {} };
    els.nickname.textContent = currentUserData.nickname || "유저";
    els.cash.textContent = fmt(currentUserData.cash) + "원";
    els.totalAssets.textContent = fmt(totalAssetsOf(currentUserData)) + "원";
    renderPortfolio();
    renderTradeModal();
    renderMarket();
    renderOrders();
  });
}

let allUsersCache = {};
function listenUsers() {
  db.ref("users").on("value", snap => {
    allUsersCache = snap.val() || {};
    renderRanking();
  });
}

function listenNews() {
  db.ref("news").orderByChild("time").limitToLast(50).on("value", snap => {
    const items = [];
    snap.forEach(child => items.push(child.val()));
    items.reverse();
    renderNews(items);
  });
}

// ---------- 렌더링 ----------
function priceChangeClass(id) {
  const prev = prevPrices[id] ? prevPrices[id].price : null;
  const cur = currentStocks[id] ? currentStocks[id].price : null;
  if (prev == null || cur == null || cur === prev) return "";
  return cur > prev ? "up" : "down";
}

// 당일 시가 대비 증감률
function changePctOf(id) {
  const cur = currentStocks[id] ? currentStocks[id].price : null;
  const open = dayOpenCache[id];
  if (cur == null || !open) return null;
  return ((cur - open) / open) * 100;
}

// 당일 시장 시작(09:00) 이후부터 현재까지의 시세 흐름을 보여주는 SVG 꺾은선 그래프
function sparklineSVG(id) {
  const curPrice = currentStocks[id] ? currentStocks[id].price : null;
  const stored = priceHistoryCache[id]; // Firebase 배열은 {0:.., 1:..} 객체로 올 수 있어 배열로 변환
  let hist = Array.isArray(stored) ? stored.slice() : stored ? Object.values(stored) : [];

  if (hist.length === 0) {
    if (curPrice == null) return `<span class="spark-empty">-</span>`;
    hist = [curPrice];
  }
  // 가장 최근 값이 실시간 현재가보다 오래됐으면(최대 1분 지연) 끝에 현재가를 붙여 최신 상태로 보여줌
  if (curPrice != null && hist[hist.length - 1] !== curPrice) {
    hist = hist.concat(curPrice);
  }
  if (hist.length === 1) hist = [hist[0], hist[0]];

  const w = 68, h = 24;
  const min = Math.min(...hist), max = Math.max(...hist);
  const range = (max - min) || 1;
  const step = w / (hist.length - 1);
  const points = hist.map((p, i) => {
    const x = (i * step).toFixed(1);
    const y = (h - ((p - min) / range) * h).toFixed(1);
    return `${x},${y}`;
  }).join(" ");
  const trendCls = hist[hist.length - 1] >= hist[0] ? "up" : "down";
  return `<svg class="spark ${trendCls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.6" />
    </svg>`;
}

let sortMode = "sector"; // sector | price | name
let pinOwned = false;

function isOwnedId(id) {
  const holdings = currentUserData.holdings || {};
  return normalizeHolding(holdings[id]).qty > 0;
}

function getSortedCompanies(mode) {
  const list = ALL_COMPANIES.slice();
  if (mode === "price") {
    list.sort((a, b) => {
      const pa = currentStocks[a.id] ? currentStocks[a.id].price : 0;
      const pb = currentStocks[b.id] ? currentStocks[b.id].price : 0;
      return pb - pa; // 높은 가격 순
    });
  } else if (mode === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } else {
    const sectorOrder = Object.keys(SECTORS);
    list.sort((a, b) => sectorOrder.indexOf(a.sector) - sectorOrder.indexOf(b.sector));
  }
  return list;
}

function stockRowHTML(c) {
  const s = currentStocks[c.id];
  if (!s) return "";
  const cls = priceChangeClass(c.id);
  const marketCap = s.price * s.listedShares;
  const chg = changePctOf(c.id);
  const chgCls = chg == null ? "" : chg > 0 ? "up" : chg < 0 ? "down" : "";
  const chgText = chg == null ? "-" : `${chg > 0 ? "+" : ""}${chg.toFixed(2)}%`;
  const ownedCls = isOwnedId(c.id) ? "owned" : "";
  return `
    <tr class="stock-row ${ownedCls}" data-id="${c.id}">
      <td class="name">${s.name}</td>
      <td class="price ${cls}">${fmt(s.price)}원</td>
      <td class="listed">${fmt(s.listedShares)}주</td>
      <td class="cap">${fmt(marketCap)}원</td>
      <td><button class="trade-btn" data-id="${c.id}">거래</button></td>
    </tr>
    <tr class="stock-sub-row" data-id="${c.id}">
      <td colspan="5">
        <div class="sub-row-inner">
          <span class="spark-wrap">${sparklineSVG(c.id)}</span>
          <span class="chg ${chgCls}">${chgText}</span>
          <span class="chg-label">당일 시가 대비</span>
        </div>
      </td>
    </tr>`;
}

function renderMarket() {
  let list = getSortedCompanies(sortMode);
  let html = "";

  let pinnedList = [];
  if (pinOwned) {
    pinnedList = list.filter(c => isOwnedId(c.id));
    list = list.filter(c => !isOwnedId(c.id));
  }

  if (pinnedList.length > 0) {
    html += `<tr class="pin-header-row"><td colspan="5">📌 보유 종목</td></tr>`;
    pinnedList.forEach(c => { html += stockRowHTML(c); });
    html += `<tr class="section-divider-row"><td colspan="5"></td></tr>`;
  }

  if (sortMode === "sector") {
    let curSector = null;
    list.forEach(c => {
      if (c.sector !== curSector) {
        curSector = c.sector;
        html += `<tr class="sector-row"><td colspan="5">${SECTOR_LABEL[curSector]}</td></tr>`;
      }
      html += stockRowHTML(c);
    });
  } else {
    list.forEach(c => { html += stockRowHTML(c); });
  }

  els.marketBody.innerHTML = html;

  els.marketBody.querySelectorAll(".trade-btn").forEach(btn => {
    btn.addEventListener("click", () => openTradeModal(btn.dataset.id));
  });

  // 상단 티커
  const tickerItems = Object.values(currentStocks).map(s => {
    const cls = priceChangeClass(Object.keys(currentStocks).find(k => currentStocks[k] === s));
    return `<span class="ticker-item ${cls}">${s.name} ${fmt(s.price)}원</span>`;
  });
  els.ticker.innerHTML = tickerItems.join(" &nbsp;·&nbsp; ") + " &nbsp;·&nbsp; ";
}

function renderPortfolio() {
  const holdings = currentUserData.holdings || {};
  const entries = Object.keys(holdings)
    .map(id => ({ id, h: normalizeHolding(holdings[id]) }))
    .filter(e => e.h.qty > 0);
  if (entries.length === 0) {
    els.portfolioBody.innerHTML = `<tr><td colspan="4" class="empty">보유 종목이 없습니다.</td></tr>`;
    return;
  }
  let html = "";
  entries.forEach(({ id, h }) => {
    const s = currentStocks[id];
    if (!s) return;
    const hasAvg = h.avgPrice > 0;
    const returnPct = hasAvg ? ((s.price - h.avgPrice) / h.avgPrice) * 100 : null;
    const cls = returnPct == null ? "" : returnPct > 0 ? "up" : returnPct < 0 ? "down" : "";
    const returnText = returnPct == null
      ? "-"
      : `${returnPct > 0 ? "+" : ""}${returnPct.toFixed(2)}%`;
    html += `
      <tr>
        <td>${s.name}</td>
        <td>${fmt(h.qty)}주</td>
        <td>${hasAvg ? fmt(h.avgPrice) + "원" : "-"}</td>
        <td class="${cls}">${returnText}</td>
      </tr>`;
  });
  els.portfolioBody.innerHTML = html;
}

function renderOrders() {
  const orders = currentUserData.orders || {};
  const list = Object.keys(orders)
    .map(orderId => ({ orderId, o: orders[orderId] }))
    .filter(x => x.o)
    .sort((a, b) => (b.o.createdAt || 0) - (a.o.createdAt || 0))
    .slice(0, 30); // 최근 30건만 표시

  if (list.length === 0) {
    els.ordersList.innerHTML = `<li class="empty">예약주문이 없습니다.</li>`;
    return;
  }

  const statusLabel = { pending: "대기중", filled: "체결됨", cancelled: "취소됨" };

  els.ordersList.innerHTML = list.map(({ orderId, o }) => {
    const stockName = (currentStocks[o.stockId] && currentStocks[o.stockId].name) || o.stockId;
    const sideLabel = o.side === "buy" ? "매수" : "매도";
    const cancelBtn = o.status === "pending"
      ? `<button class="cancel-order-btn" data-order-id="${orderId}">취소</button>`
      : "";
    return `
      <li>
        <div class="order-info">
          <span><span class="order-side ${o.side}">${sideLabel}</span> ${stockName}</span>
          <span class="order-meta">${fmt(o.qty)}주 · 예약가 ${fmt(o.limitPrice)}원${o.status === "filled" ? ` · 체결가 ${fmt(o.filledPrice)}원` : ""}</span>
        </div>
        <span class="order-status ${o.status}">${statusLabel[o.status] || o.status}</span>
        ${cancelBtn}
      </li>`;
  }).join("");

  els.ordersList.querySelectorAll(".cancel-order-btn").forEach(btn => {
    btn.addEventListener("click", () => cancelOrder(btn.dataset.orderId));
  });
}

function renderNews(items) {
  if (items.length === 0) {
    els.newsList.innerHTML = `<li class="empty">아직 뉴스가 없습니다.</li>`;
    return;
  }
  els.newsList.innerHTML = items.map(n => {
    const t = new Date(n.time);
    const time = t.toLocaleTimeString("ko-KR", { hour12: false });
    return `<li><span class="news-time">${time}</span> ${n.text}</li>`;
  }).join("");
}

function renderRanking() {
  const rows = Object.entries(allUsersCache).map(([uid, u]) => ({
    uid, nickname: u.nickname || "익명", total: totalAssetsOf(u)
  }));
  rows.sort((a, b) => b.total - a.total);
  els.rankBody.innerHTML = rows.map((r, i) => `
    <tr class="${r.uid === currentUid ? "me" : ""}">
      <td>${i + 1}</td>
      <td>${r.nickname}${r.uid === currentUid ? " (나)" : ""}</td>
      <td>${fmt(r.total)}원</td>
    </tr>`).join("");
}

// ---------- 거래 모달 (예약주문) ----------
function openTradeModal(id) {
  selectedStockId = id;
  els.tradeQty.value = 1;
  const s = currentStocks[id];
  els.tradeLimitPrice.value = s ? s.price : "";
  renderTradeModal();
  els.tradeModal.classList.remove("hidden");
}
els.closeTradeBtn.addEventListener("click", () => els.tradeModal.classList.add("hidden"));
els.tradeQty.addEventListener("input", renderTradeModal);
els.tradeLimitPrice.addEventListener("input", renderTradeModal);
els.useMarketPriceBtn.addEventListener("click", () => {
  const s = currentStocks[selectedStockId];
  if (!s) return;
  els.tradeLimitPrice.value = s.price;
  renderTradeModal();
});

const qtyButtons = document.querySelectorAll(".qty-btn");
qtyButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    els.tradeQty.value = btn.dataset.qty;
    renderTradeModal();
  });
});

function renderTradeModal() {
  if (!selectedStockId) return;
  const s = currentStocks[selectedStockId];
  if (!s) return;
  const qty = Math.max(0, parseInt(els.tradeQty.value) || 0);
  const limitPrice = Math.max(0, parseInt(els.tradeLimitPrice.value) || 0);
  const owned = normalizeHolding((currentUserData.holdings || {})[selectedStockId]);
  els.tradeStockName.textContent = s.name;
  els.tradePrice.textContent = fmt(s.price) + "원";
  els.tradeOwned.textContent = fmt(owned.qty) + "주";
  els.tradeTotal.textContent = fmt(limitPrice * qty) + "원";

  qtyButtons.forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.qty) === qty);
  });

  if (owned.qty > 0 && owned.avgPrice > 0) {
    const returnPct = ((s.price - owned.avgPrice) / owned.avgPrice) * 100;
    const cls = returnPct > 0 ? "up" : returnPct < 0 ? "down" : "";
    els.tradeReturn.className = cls;
    els.tradeReturn.textContent = `${returnPct > 0 ? "+" : ""}${returnPct.toFixed(2)}% (평단가 ${fmt(owned.avgPrice)}원)`;
    els.tradeReturnRow.style.display = "flex";
  } else {
    els.tradeReturnRow.style.display = "none";
  }
}

// 예약주문 등록: 즉시 체결되지 않고, 가격이 4번 바뀐 뒤부터 조건(매수: 가격<=예약가 / 매도: 가격>=예약가) 충족 시 자동 체결
async function placeOrder(side) {
  const qty = Math.max(0, parseInt(els.tradeQty.value) || 0);
  const limitPrice = Math.max(0, parseInt(els.tradeLimitPrice.value) || 0);
  if (qty <= 0 || limitPrice <= 0 || !selectedStockId) return;

  const tickSnap = await db.ref("market/meta/priceTickCount").once("value");
  const createdTickCount = tickSnap.val() || 0;
  const orderId = db.ref("users/" + currentUid + "/orders").push().key;
  await db.ref(`users/${currentUid}/orders/${orderId}`).set({
    stockId: selectedStockId,
    side,
    qty,
    limitPrice,
    createdTickCount,
    createdAt: Date.now(),
    status: "pending"
  });
  els.tradeModal.classList.add("hidden");
}

els.buyBtn.addEventListener("click", () => placeOrder("buy"));
els.sellBtn.addEventListener("click", () => placeOrder("sell"));

async function cancelOrder(orderId) {
  await db.ref(`users/${currentUid}/orders/${orderId}/status`).set("cancelled");
}



// ---------- 정렬 / 보유종목 상단고정 ----------
els.sortSelect.addEventListener("change", () => {
  sortMode = els.sortSelect.value;
  renderMarket();
});
els.pinOwnedToggle.addEventListener("change", () => {
  pinOwned = els.pinOwnedToggle.checked;
  renderMarket();
});

// ---------- 탭 전환 ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

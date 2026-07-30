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
// 기업별 이슈 (전체 18개 기업 중 무작위 1곳)
const COMPANY_TEMPLATES = [
  { text: n => `${n} 오너일가 갑질 논란`, pct: -5 },
  { text: n => `${n}, 아동단체에 기부`, pct: 3 },
  { text: n => `${n}, 오늘의 기업 선정`, pct: 5 },
  { text: n => `${n} 내부 비리 고발`, pct: -3 }
];

// 종목별 이슈 (해당 종목 내 무작위 1개 기업에 적용)
const SECTOR_TEMPLATES = {
  tech: [
    { text: n => `${n} 생산 공장에 화재`, pct: -3 },
    { text: n => `${n} 산업 스파이로 기술 유출`, pct: -5 },
    { text: n => `${n} 신기술 개발`, pct: 5 },
    { text: n => `${n} 국가 지원 확대`, pct: 3 }
  ],
  ent: [
    { text: n => `${n} 소속 아이돌 멜론차트 1위`, pct: 5 },
    { text: n => `${n} 소속 아이돌 갑질 논란`, pct: -5 },
    { text: n => `${n} 소속 아이돌 충격 열애설`, pct: -3 },
    { text: n => `${n} 소속 아이돌 국가 홍보대사 선정`, pct: 3 }
  ],
  bio: [
    { text: n => `${n} 신약개발`, pct: 5 },
    { text: n => `${n} 약품서 인체 유해성분 검출`, pct: -3 },
    { text: n => `${n} 약품 부작용 발견`, pct: -5 },
    { text: n => `${n} 약품원료 가격 하락`, pct: 3 }
  ],
  food: [
    { text: n => `${n} 신제품 출시`, pct: 5 },
    { text: n => `${n} 인체 유해성분 발견`, pct: -3 },
    { text: n => `${n} 생산공장 위생 논란`, pct: -5 },
    { text: n => `${n} 제품 건강 효능 발견`, pct: 3 }
  ],
  const: [
    { text: n => `${n} 노동자 시위`, pct: -3 },
    { text: n => `${n} 건물 완공`, pct: 3 },
    { text: n => `${n} 국가 건물 건설 추진`, pct: 5 },
    { text: n => `${n} 건설 현장서 인명사고`, pct: -5 }
  ],
  chem: [
    { text: n => `${n} 신소재 개발`, pct: 5 },
    { text: n => `${n} 생산 공장서 인체 유해물질 대량 유출`, pct: -5 },
    { text: n => `${n} 생산 공장서 화재`, pct: -3 },
    { text: n => `${n} 국가 지원 확대`, pct: 3 }
  ]
};

// 글로벌 이슈 (전체 기업에 동일 적용)
const GLOBAL_TEMPLATES = [
  { text: "전염병 팬데믹 발생", pct: -5 },
  { text: "역대급 경제 호황", pct: 5 },
  { text: "중동서 전쟁 발생", pct: -5 },
  { text: "트럼프 관세 낮추겠다 발표", pct: 3 }
];

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
  if (keys.length > 200) {
    const toRemove = keys.slice(0, keys.length - 200);
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
    lastCompanyEvent: 0,
    lastSectorEvent: 0,
    lastGlobalCheck: 0,
    globalCooldownUntil: 0,
    tradingDate: todayStrKST()
  });
  const dayOpen = {};
  for (const id in stocks) dayOpen[id] = stocks[id].price;
  await db.ref("market/dayOpen").set(dayOpen);
}

// ---------- 당일 시가(증감률 기준) 관리 ----------
function todayStrKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 날짜가 바뀌면(장 시작 시점) 그날의 시가를 새로 스냅샷 (여러 브라우저 중 하나만 실행)
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
  for (const id in stocks) dayOpen[id] = stocks[id].price;
  await db.ref("market/dayOpen").set(dayOpen);
}

// ---------- 개별 종목에 이벤트 적용 ----------
async function applyEventToStock(id, pct) {
  const ref = db.ref("market/stocks/" + id);
  await ref.transaction(s => {
    if (!s) return s;
    s.price = Math.max(1, Math.round(s.price * (1 + pct / 100)));
    if (s.price > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      s.listedShares = LISTED_SHARES_UPGRADE;
    }
    return s;
  });
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
    const pct = randomWalkPercent();
    const newPrice = Math.max(1, Math.round(s.price * (1 + pct / 100)));
    updates[id + "/price"] = newPrice;
    if (newPrice > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      updates[id + "/listedShares"] = LISTED_SHARES_UPGRADE;
    }
  }
  await db.ref("market/stocks").update(updates);
}

// ---------- 기업별 이슈 (1분마다) ----------
async function tickCompanyEvent() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastCompanyEvent", 60000);
  if (!ok) return;
  const company = pick(ALL_COMPANIES);
  const tmpl = pick(COMPANY_TEMPLATES);
  await applyEventToStock(company.id, tmpl.pct);
  await pushNews(`[기업] ${tmpl.text(company.name)} (${tmpl.pct > 0 ? "+" : ""}${tmpl.pct}%)`);
}

// ---------- 종목별 이슈 (30초마다) ----------
async function tickSectorEvent() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastSectorEvent", 30000);
  if (!ok) return;
  const sectorKey = pick(Object.keys(SECTORS));
  const company = pick(SECTORS[sectorKey]);
  const tmpl = pick(SECTOR_TEMPLATES[sectorKey]);
  await applyEventToStock(company.id, tmpl.pct);
  await pushNews(`[${SECTOR_LABEL[sectorKey]}] ${tmpl.text(company.name)} (${tmpl.pct > 0 ? "+" : ""}${tmpl.pct}%)`);
}

// ---------- 글로벌 이슈 (1분마다 체크, 30% 확률, 5분 쿨타임) ----------
async function tickGlobalEvent() {
  if (!isMarketOpen()) return;
  const ok = await claim("market/meta/lastGlobalCheck", 60000);
  if (!ok) return;
  const cdSnap = await db.ref("market/meta/globalCooldownUntil").once("value");
  const cooldownUntil = cdSnap.val() || 0;
  if (Date.now() < cooldownUntil) return;
  if (Math.random() >= 0.3) return;

  const tmpl = pick(GLOBAL_TEMPLATES);
  const snap = await db.ref("market/stocks").once("value");
  const stocks = snap.val();
  if (!stocks) return;
  const updates = {};
  for (const id in stocks) {
    const s = stocks[id];
    const newPrice = Math.max(1, Math.round(s.price * (1 + tmpl.pct / 100)));
    updates[id + "/price"] = newPrice;
    if (newPrice > LISTED_SHARES_PRICE_TRIGGER && s.listedShares < LISTED_SHARES_UPGRADE) {
      updates[id + "/listedShares"] = LISTED_SHARES_UPGRADE;
    }
  }
  await db.ref("market/stocks").update(updates);
  await db.ref("market/meta/globalCooldownUntil").set(Date.now() + 5 * 60000);
  await pushNews(`🌍 [글로벌] ${tmpl.text} (전체 ${tmpl.pct > 0 ? "+" : ""}${tmpl.pct}%)`);
}

function startMarketLoop() {
  setInterval(() => {
    ensureTradingDay();
    tickPriceUpdate();
    tickCompanyEvent();
    tickSectorEvent();
    tickGlobalEvent();
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
const priceHistoryLocal = {}; // 종목별 최근 가격 배열 (미니 그래프용, 브라우저 세션 한정)
const MAX_HISTORY = 30;

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
  newsList: document.getElementById("news-list"),
  rankBody: document.getElementById("rank-body"),
  tradeModal: document.getElementById("trade-modal"),
  tradeStockName: document.getElementById("trade-stock-name"),
  tradePrice: document.getElementById("trade-price"),
  tradeQty: document.getElementById("trade-qty"),
  tradeOwned: document.getElementById("trade-owned"),
  tradeReturnRow: document.getElementById("trade-return-row"),
  tradeReturn: document.getElementById("trade-return"),
  tradeTotal: document.getElementById("trade-total"),
  buyBtn: document.getElementById("buy-btn"),
  sellBtn: document.getElementById("sell-btn"),
  closeTradeBtn: document.getElementById("close-trade-btn"),
  marketStatus: document.getElementById("market-status")
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
    for (const id in stocks) {
      const arr = priceHistoryLocal[id] || (priceHistoryLocal[id] = []);
      arr.push(stocks[id].price);
      if (arr.length > MAX_HISTORY) arr.shift();
    }
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

function listenUser() {
  db.ref("users/" + currentUid).on("value", snap => {
    currentUserData = snap.val() || { cash: 0, holdings: {} };
    els.nickname.textContent = currentUserData.nickname || "유저";
    els.cash.textContent = fmt(currentUserData.cash) + "원";
    els.totalAssets.textContent = fmt(totalAssetsOf(currentUserData)) + "원";
    renderPortfolio();
    renderTradeModal();
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
  db.ref("news").orderByChild("time").limitToLast(40).on("value", snap => {
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

// 최근 시세 흐름을 보여주는 작은 SVG 꺾은선 그래프
function sparklineSVG(id) {
  const hist = priceHistoryLocal[id];
  if (!hist || hist.length < 2) {
    return `<span class="spark-empty">수집 중…</span>`;
  }
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

function renderMarket() {
  const sectorsOrder = Object.keys(SECTORS);
  let html = "";
  sectorsOrder.forEach(sec => {
    html += `<tr class="sector-row"><td colspan="5">${SECTOR_LABEL[sec]}</td></tr>`;
    SECTORS[sec].forEach(c => {
      const s = currentStocks[c.id];
      if (!s) return;
      const cls = priceChangeClass(c.id);
      const marketCap = s.price * s.listedShares;
      const chg = changePctOf(c.id);
      const chgCls = chg == null ? "" : chg > 0 ? "up" : chg < 0 ? "down" : "";
      const chgText = chg == null ? "-" : `${chg > 0 ? "+" : ""}${chg.toFixed(2)}%`;
      html += `
        <tr class="stock-row" data-id="${c.id}">
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
    });
  });
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
    els.portfolioBody.innerHTML = `<tr><td colspan="6" class="empty">보유 종목이 없습니다.</td></tr>`;
    return;
  }
  let html = "";
  entries.forEach(({ id, h }) => {
    const s = currentStocks[id];
    if (!s) return;
    const value = s.price * h.qty;
    const returnPct = h.avgPrice > 0 ? ((s.price - h.avgPrice) / h.avgPrice) * 100 : 0;
    const cls = returnPct > 0 ? "up" : returnPct < 0 ? "down" : "";
    html += `
      <tr>
        <td>${s.name}</td>
        <td>${fmt(h.qty)}주</td>
        <td>${fmt(h.avgPrice)}원</td>
        <td>${fmt(s.price)}원</td>
        <td>${fmt(value)}원</td>
        <td class="${cls}">${returnPct > 0 ? "+" : ""}${returnPct.toFixed(2)}%</td>
      </tr>`;
  });
  els.portfolioBody.innerHTML = html;
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

// ---------- 거래 모달 ----------
function openTradeModal(id) {
  selectedStockId = id;
  els.tradeQty.value = 1;
  renderTradeModal();
  els.tradeModal.classList.remove("hidden");
}
els.closeTradeBtn.addEventListener("click", () => els.tradeModal.classList.add("hidden"));
els.tradeQty.addEventListener("input", renderTradeModal);

function renderTradeModal() {
  if (!selectedStockId) return;
  const s = currentStocks[selectedStockId];
  if (!s) return;
  const qty = Math.max(0, parseInt(els.tradeQty.value) || 0);
  const owned = normalizeHolding((currentUserData.holdings || {})[selectedStockId]);
  els.tradeStockName.textContent = s.name;
  els.tradePrice.textContent = fmt(s.price) + "원";
  els.tradeOwned.textContent = fmt(owned.qty) + "주";
  els.tradeTotal.textContent = fmt(s.price * qty) + "원";

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

els.buyBtn.addEventListener("click", async () => {
  const qty = Math.max(0, parseInt(els.tradeQty.value) || 0);
  if (qty <= 0) return;
  const s = currentStocks[selectedStockId];
  const price = s.price;
  const cost = price * qty;
  const ref = db.ref("users/" + currentUid);
  const res = await ref.transaction(u => {
    if (!u) return u;
    if ((u.cash || 0) < cost) return; // 잔액 부족 -> 중단
    u.cash = (u.cash || 0) - cost;
    u.holdings = u.holdings || {};
    const existing = normalizeHolding(u.holdings[selectedStockId], price);
    const newQty = existing.qty + qty;
    // 매수 시점 기준 가중평균 평단가 계산
    const newAvgPrice = Math.round((existing.avgPrice * existing.qty + price * qty) / newQty);
    u.holdings[selectedStockId] = { qty: newQty, avgPrice: newAvgPrice };
    return u;
  });
  if (!res.committed) alert("현금이 부족합니다.");
});

els.sellBtn.addEventListener("click", async () => {
  const qty = Math.max(0, parseInt(els.tradeQty.value) || 0);
  if (qty <= 0) return;
  const s = currentStocks[selectedStockId];
  const revenue = s.price * qty;
  const ref = db.ref("users/" + currentUid);
  const res = await ref.transaction(u => {
    if (!u) return u;
    const existing = normalizeHolding(u.holdings && u.holdings[selectedStockId]);
    if (existing.qty < qty) return; // 보유 부족 -> 중단
    u.cash = (u.cash || 0) + revenue;
    const remainingQty = existing.qty - qty;
    // 매도는 평단가를 바꾸지 않음(남은 수량이 있으면 유지, 없으면 초기화)
    u.holdings[selectedStockId] = remainingQty > 0
      ? { qty: remainingQty, avgPrice: existing.avgPrice }
      : { qty: 0, avgPrice: 0 };
    return u;
  });
  if (!res.committed) alert("보유 수량이 부족합니다.");
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

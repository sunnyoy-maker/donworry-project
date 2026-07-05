/* === Default Loans (from screenshot) === */
const DEFAULT_LOANS = [
  { name: '신용대출 (서니_KB)',      principal: 600,  rate: 5.33,  monthlyPrincipal: 0    },
  { name: '마이너스 통장 (서니_KB)', principal: 2700, rate: 5.37,  monthlyPrincipal: 0    },
  { name: '신용대출 (서니_kakao)',   principal: 399,  rate: 3.7,   monthlyPrincipal: 23   },
  { name: '신용대출 (서니_kakao)',   principal: 2500, rate: 5.58,  monthlyPrincipal: 0    },
  { name: '비상금 (서니_kakao)',     principal: 250,  rate: 7.3,   monthlyPrincipal: 0    },
  { name: '신용대출(찬스_KB)',       principal: 1400, rate: 8.35,  monthlyPrincipal: 15   },
  { name: '신용대출(찬스_우리금융)', principal: 1700, rate: 14.8,  monthlyPrincipal: 14   },
  { name: '차량대출(찬스_우리금융)', principal: 1800, rate: 7.5,   monthlyPrincipal: 45.8 },
  { name: '청약대출(찬스_KB)',       principal: 300,  rate: 3.8,   monthlyPrincipal: 0    },
  { name: '신용대출(찬스_kakao)',    principal: 200,  rate: 8.857, monthlyPrincipal: 0    },
  { name: '신용대출(찬스_NH)',       principal: 300,  rate: 19.1,  monthlyPrincipal: 5    },
];

/* === State === */
const STATE_KEY = 'house_recovery_2026';
let state = {
  basic: { married: 'single', age: '', job: '', income: 0, spouseIncome: 0 },
  assets: { cash: 0, deposit: 0, savings: 0, subscription: 0, retirement: 0, stocks: 0, etf: 0, crypto: 0, pension: 0, jeonse: 0, realestate: 0, car: 0 },
  loans: DEFAULT_LOANS.map(l => ({ ...l })),
  fixed: { rent: 0, mgmt: 0, utility: 0, telecom: 0, insurance: 0, car: 0, transport: 0, education: 0, subscription: 0, other: 0 },
  spending: { food: 0, delivery: 0, cafe: 0, shopping: 0, coupang: 0, household: 0, culture: 0, travel: 0, clothes: 0, medical: 0, other: 0 },
  income: { salary: 0, bonus: 0, business: 0, side: 0, rent: 0, other: 0 },
  goals: { selected: [], details: {} },
  monthlyRecords: [],
};

let networthChart = null;
let spendingChart = null;
let monthlyChart = null;

/* === Persistence === */
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  updateURL();
}

function loadState() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(hash)));
      state = deepMerge(state, decoded);
      if (!state.loans.length) state.loans = DEFAULT_LOANS.map(l => ({ ...l }));
      showToast('공유된 데이터를 불러왔습니다.', 'success');
      return;
    } catch (e) {}
  }
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    try {
      state = deepMerge(state, JSON.parse(saved));
      // 저장된 대출이 없으면 기본 대출 데이터 사용
      if (!state.loans.length) state.loans = DEFAULT_LOANS.map(l => ({ ...l }));
    } catch (e) {}
  }
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (Array.isArray(override[key])) {
      result[key] = override[key];
    } else if (override[key] && typeof override[key] === 'object') {
      result[key] = { ...(base[key] || {}), ...override[key] };
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

function updateURL() {
  try {
    const encoded = encodeURIComponent(btoa(JSON.stringify(state)));
    history.replaceState(null, '', '#' + encoded);
  } catch (e) {}
}

/* === Navigation === */
function initNav() {
  document.querySelectorAll('#sidebar ul li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('#sidebar ul li').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      document.getElementById('section-' + li.dataset.section).classList.add('active');
      if (li.dataset.section === 'dashboard') refreshDashboard();
      if (li.dataset.section === 'monthly') refreshMonthlySection();
    });
  });
}

/* === Formatting === */
const fmtN = (n) => Number(n || 0).toLocaleString('ko-KR');
const fmt = (n) => fmtN(n) + ' 만원';
const fmtK = (n) => {
  const v = Math.round((n || 0) * 10) / 10;
  return v.toLocaleString('ko-KR') + '만원';
};
const num = (id) => parseFloat(document.getElementById(id)?.value || 0) || 0;
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v !== undefined && v !== null) ? v : ''; };

/* === Calculations === */
function calcTotalAssets() {
  return Object.values(state.assets).reduce((a, b) => a + (parseFloat(b) || 0), 0);
}

function calcTotalLoans() {
  return state.loans.reduce((a, l) => a + (parseFloat(l.principal) || 0), 0);
}

function calcLoanMonthlyInterest(loan) {
  return (parseFloat(loan.principal) || 0) * (parseFloat(loan.rate) || 0) / 100 / 12;
}

function calcTotalMonthlyInterest() {
  return state.loans.reduce((a, l) => a + calcLoanMonthlyInterest(l), 0);
}

function calcTotalMonthlyPrincipal() {
  return state.loans.reduce((a, l) => a + (parseFloat(l.monthlyPrincipal) || 0), 0);
}

function calcAvgRate() {
  const totalPrincipal = calcTotalLoans();
  if (!totalPrincipal || !state.loans.length) return 0;
  const weightedSum = state.loans.reduce((a, l) => a + ((parseFloat(l.principal) || 0) * (parseFloat(l.rate) || 0) / 100), 0);
  return (weightedSum / totalPrincipal * 100).toFixed(2);
}

function calcTotalFixed() {
  return Object.values(state.fixed).reduce((a, b) => a + (parseFloat(b) || 0), 0);
}

function calcTotalSpending() {
  return Object.values(state.spending).reduce((a, b) => a + (parseFloat(b) || 0), 0);
}

function calcMonthlyIncomeFromIncomeSection() {
  const s = state.income;
  return (parseFloat(s.salary) || 0)
    + (parseFloat(s.bonus) || 0) / 12
    + (parseFloat(s.business) || 0)
    + (parseFloat(s.side) || 0)
    + (parseFloat(s.rent) || 0)
    + (parseFloat(s.other) || 0);
}

function calcNetWorth() {
  return calcTotalAssets() - calcTotalLoans();
}

function calcTotalMonthlyIncome() {
  return (parseFloat(state.basic.income) || 0)
    + (parseFloat(state.basic.spouseIncome) || 0)
    + calcMonthlyIncomeFromIncomeSection();
}

function calcMonthlyExpenses() {
  return calcTotalFixed() + calcTotalSpending() + calcTotalMonthlyInterest();
}

function calcCashflow() {
  return calcTotalMonthlyIncome() - calcMonthlyExpenses();
}

/* === Dashboard === */
function refreshDashboard() {
  const netWorth = calcNetWorth();
  const totalAssets = calcTotalAssets();
  const totalLoans = calcTotalLoans();
  const cashflow = calcCashflow();
  const totalIncome = calcTotalMonthlyIncome();
  const totalExpenses = calcMonthlyExpenses();

  const nwEl = document.getElementById('dash-net-worth');
  nwEl.textContent = fmt(netWorth);
  nwEl.className = 'card-value ' + (netWorth >= 0 ? 'positive' : 'negative');

  // 월별 기록에서 이전 달 비교
  const records = state.monthlyRecords;
  const trendEl = document.getElementById('dash-net-trend');
  if (records.length >= 1) {
    const prev = records[records.length - 1].netWorth;
    const diff = netWorth - prev;
    trendEl.textContent = (diff >= 0 ? '▲ +' : '▼ ') + fmt(diff) + ' (전월 대비)';
    trendEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    trendEl.textContent = '';
  }

  document.getElementById('dash-total-assets').textContent = fmt(totalAssets);
  document.getElementById('dash-total-loans').textContent = fmt(totalLoans);

  const cfEl = document.getElementById('dash-cashflow');
  cfEl.textContent = fmt(cashflow);
  cfEl.className = 'card-value ' + (cashflow >= 0 ? 'positive' : 'negative');

  document.getElementById('dash-income').textContent = fmt(totalIncome);
  document.getElementById('dash-expenses').textContent = fmt(totalExpenses);

  updateRisk(netWorth, totalLoans, totalIncome, cashflow);
  drawNetworthChart(netWorth, cashflow);
  updateDailyTip();
}

function updateRisk(netWorth, totalLoans, totalIncome, cashflow) {
  const monthlyInterest = calcTotalMonthlyInterest();
  const dti = totalIncome > 0 ? (monthlyInterest / totalIncome * 100) : 0;
  let level = 'safe';
  let reason = '재무 상태가 안정적입니다.';

  if (netWorth < 0 && totalLoans > totalIncome * 24) {
    level = 'danger';
    reason = `순자산 ${fmt(Math.round(netWorth))}, 대출 상환에 ${Math.ceil(totalLoans / Math.max(calcTotalMonthlyPrincipal(), 1))}개월 이상 필요합니다.`;
  } else if (dti > 30 || cashflow < 0) {
    level = 'warning';
    reason = `월 이자가 수입의 ${dti.toFixed(0)}%입니다. 현금흐름 ${fmt(Math.round(cashflow))} 관리가 필요합니다.`;
  } else {
    reason = `순자산 ${fmt(Math.round(netWorth))}, 월 현금흐름 ${fmt(Math.round(cashflow))}으로 안정적입니다.`;
  }

  document.querySelectorAll('.risk-dot').forEach(d => d.classList.remove('active'));
  document.querySelector(`.risk-dot.${level}`).classList.add('active');
  document.getElementById('risk-reason').textContent = reason;
}

function drawNetworthChart(currentNetWorth, monthlyCashflow) {
  const ctx = document.getElementById('chart-networth').getContext('2d');

  // 월별 실제 기록이 있으면 그것도 포함
  const records = state.monthlyRecords;
  let labels = [], data = [];

  if (records.length > 0) {
    records.forEach(r => { labels.push(r.ym); data.push(r.netWorth); });
    labels.push('현재');
    data.push(Math.round(currentNetWorth));
  }

  // 미래 예측 추가
  const futureMths = [3, 6, 12, 24, 36];
  futureMths.forEach(m => {
    labels.push('+' + (m < 12 ? m + '개월' : m / 12 + '년'));
    data.push(Math.round(currentNetWorth + monthlyCashflow * m));
  });

  if (!labels.length) {
    labels = ['현재', '+3개월', '+6개월', '+1년', '+2년', '+3년'];
    const mths = [0, 3, 6, 12, 24, 36];
    data = mths.map(m => Math.round(currentNetWorth + monthlyCashflow * m));
  }

  const splitIdx = records.length > 0 ? records.length : 0;

  if (networthChart) networthChart.destroy();
  networthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '실제 기록',
          data: data.map((v, i) => i <= splitIdx ? v : null),
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78,205,196,0.1)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4ecdc4',
          pointRadius: 5,
        },
        {
          label: '예상 추이',
          data: data.map((v, i) => i >= splitIdx ? v : null),
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.08)',
          borderWidth: 2,
          borderDash: [6, 4],
          fill: true,
          tension: 0.4,
          pointBackgroundColor: data.map(v => v >= 0 ? '#2ecc71' : '#e74c3c'),
          pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8890b0', font: { size: 12 }, boxWidth: 20 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtN(ctx.parsed.y) + ' 만원' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8890b0', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8890b0', callback: v => fmtN(v) } }
      }
    }
  });
}

function updateDailyTip() {
  const tips = [];
  const cashflow = calcCashflow();
  const totalIncome = calcTotalMonthlyIncome();

  if (state.loans.length > 0) {
    const maxRateLoan = state.loans.reduce((a, b) => (parseFloat(b.rate) > parseFloat(a.rate) ? b : a));
    if (parseFloat(maxRateLoan.rate) > 10) {
      const annualInterest = Math.round(calcLoanMonthlyInterest(maxRateLoan) * 12);
      tips.push(`💡 "${maxRateLoan.name}" 금리 ${maxRateLoan.rate}%로 가장 높습니다. 연간 이자 ${fmt(annualInterest)} — 최우선 상환 대상입니다.`);
    }
  }

  if (totalIncome > 0) {
    const deliveryRatio = ((state.spending.delivery || 0) / totalIncome * 100);
    if (deliveryRatio > 5) tips.push(`🛵 배달 지출이 수입의 ${deliveryRatio.toFixed(0)}%입니다. 주 2회만 줄여도 월 ${Math.round((state.spending.delivery || 0) * 0.4)}만원 절약돼요.`);
    const shoppingRatio = ((state.spending.shopping || 0) / totalIncome * 100);
    if (shoppingRatio > 10) tips.push(`🛍 쇼핑이 수입의 ${shoppingRatio.toFixed(0)}%로 높습니다. 이번 달 예산을 먼저 정해보세요.`);
  }

  const records = state.monthlyRecords;
  if (records.length >= 2) {
    const prev = records[records.length - 2].netWorth;
    const curr = records[records.length - 1].netWorth;
    const diff = curr - prev;
    if (diff > 0) tips.push(`📈 지난 달보다 순자산이 ${fmt(Math.round(diff))} 늘었습니다. 잘하고 있습니다!`);
    else tips.push(`📉 지난 달보다 순자산이 ${fmt(Math.round(Math.abs(diff)))} 줄었습니다. 이번 달은 소비를 점검해보세요.`);
  }

  if (cashflow > 50) tips.push(`✅ 월 현금흐름 +${fmt(Math.round(cashflow))}입니다. 잉여금은 고금리 대출 상환에 우선 쓰는 것이 유리합니다.`);
  else if (cashflow < 0) tips.push(`⚠️ 월 현금흐름이 ${fmt(Math.round(cashflow))}입니다. 고정비부터 점검해보세요.`);

  if (!tips.length) tips.push('📊 데이터를 더 입력할수록 정밀한 분석이 가능합니다. 자산과 수입부터 채워보세요!');
  document.getElementById('today-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
}

/* === Section: Basic === */
function initBasic() {
  const s = state.basic;
  setVal('basic-married', s.married || 'single');
  setVal('basic-age', s.age);
  setVal('basic-job', s.job);
  setVal('basic-income', s.income || '');
  setVal('basic-spouse-income', s.spouseIncome || '');
  toggleSpouseIncome();
  document.getElementById('basic-married').addEventListener('change', toggleSpouseIncome);
}

function toggleSpouseIncome() {
  const married = document.getElementById('basic-married').value === 'married';
  document.getElementById('spouse-income-group').style.display = married ? '' : 'none';
}

function saveBasic() {
  state.basic = {
    married: document.getElementById('basic-married').value,
    age: document.getElementById('basic-age').value,
    job: document.getElementById('basic-job').value,
    income: num('basic-income'),
    spouseIncome: num('basic-spouse-income'),
  };
}

/* === Section: Assets === */
function initAssets() {
  const a = state.assets;
  Object.keys(a).forEach(k => setVal('asset-' + k, a[k] || ''));
  updateAssetTotal();
  document.querySelectorAll('#section-assets input').forEach(el => el.addEventListener('input', updateAssetTotal));
}

function updateAssetTotal() {
  const keys = ['cash','deposit','savings','subscription','retirement','stocks','etf','crypto','pension','jeonse','realestate','car'];
  const total = keys.reduce((a, k) => a + num('asset-' + k), 0);
  document.getElementById('total-assets-calc').textContent = fmt(total);
}

function saveAssets() {
  ['cash','deposit','savings','subscription','retirement','stocks','etf','crypto','pension','jeonse','realestate','car'].forEach(k => {
    state.assets[k] = num('asset-' + k);
  });
}

/* === Section: Loans (Inline Table) === */
function renderLoans() {
  const tbody = document.getElementById('loans-tbody');
  if (!tbody) return;
  tbody.innerHTML = state.loans.map((loan, idx) => {
    const mi = calcLoanMonthlyInterest(loan);
    const mp = parseFloat(loan.monthlyPrincipal) || 0;
    const mt = mi + mp;
    const rateN = parseFloat(loan.rate) || 0;
    const rateColor = rateN >= 15 ? '#e74c3c' : rateN >= 8 ? '#f1c40f' : '#2ecc71';
    return `<tr data-idx="${idx}">
      <td style="min-width:160px">
        <input type="text" value="${escHtml(loan.name || '')}"
          oninput="updateLoanField(${idx},'name',this.value)"
          style="min-width:150px" />
      </td>
      <td style="min-width:100px">
        <input type="number" value="${loan.principal || ''}"
          oninput="updateLoanField(${idx},'principal',this.value)"
          style="width:90px" />
      </td>
      <td style="min-width:90px">
        <input type="number" value="${loan.rate || ''}" step="0.001"
          oninput="updateLoanField(${idx},'rate',this.value)"
          style="width:78px; color:${rateColor}" />
      </td>
      <td style="min-width:110px">
        <input type="number" value="${loan.monthlyPrincipal || ''}" step="0.1"
          oninput="updateLoanField(${idx},'monthlyPrincipal',this.value)"
          style="width:88px" />
      </td>
      <td class="calc-cell" id="loan-mi-${idx}">${fmtK(mi)}</td>
      <td class="calc-cell bold" id="loan-mt-${idx}">${fmtK(mt)}</td>
      <td><button class="btn-del-loan" onclick="deleteLoan(${idx})" title="삭제">×</button></td>
    </tr>`;
  }).join('');
  updateLoanTotals();
  updateSimLoanSelect();
}

function updateLoanField(idx, field, value) {
  if (!state.loans[idx]) return;
  state.loans[idx][field] = (field === 'name') ? value : (parseFloat(value) || 0);
  const loan = state.loans[idx];
  const mi = calcLoanMonthlyInterest(loan);
  const mt = mi + (parseFloat(loan.monthlyPrincipal) || 0);
  const miEl = document.getElementById(`loan-mi-${idx}`);
  const mtEl = document.getElementById(`loan-mt-${idx}`);
  if (miEl) miEl.textContent = fmtK(mi);
  if (mtEl) mtEl.textContent = fmtK(mt);
  // Update rate color
  const rateInput = document.querySelector(`tr[data-idx="${idx}"] td:nth-child(3) input`);
  if (rateInput) {
    const rateN = parseFloat(loan.rate) || 0;
    rateInput.style.color = rateN >= 15 ? '#e74c3c' : rateN >= 8 ? '#f1c40f' : '#2ecc71';
  }
  updateLoanTotals();
}

function updateLoanTotals() {
  const totalPrincipal = calcTotalLoans();
  const avgRate = calcAvgRate();
  const totalMI = calcTotalMonthlyInterest();
  const totalMP = calcTotalMonthlyPrincipal();
  const totalMT = totalMI + totalMP;

  const set = (id, val, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (cls) el.className = cls;
  };
  set('tf-principal', fmtK(totalPrincipal), 'neg');
  set('tf-avgrate', avgRate + '%');
  set('tf-monthly-principal', fmtK(totalMP));
  set('tf-monthly-interest', fmtK(totalMI), 'neg');
  set('tf-monthly-total', fmtK(totalMT), 'neg');
}

function addLoan() {
  state.loans.push({ name: '새 대출', principal: 0, rate: 0, monthlyPrincipal: 0 });
  renderLoans();
  // Focus the new row's name input
  setTimeout(() => {
    const rows = document.querySelectorAll('#loans-tbody tr');
    const lastRow = rows[rows.length - 1];
    if (lastRow) lastRow.querySelector('input')?.focus();
  }, 50);
}

function deleteLoan(idx) {
  state.loans.splice(idx, 1);
  renderLoans();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* === Section: Fixed === */
function initFixed() {
  const f = state.fixed;
  Object.keys(f).forEach(k => setVal('fixed-' + k, f[k] || ''));
  updateFixedTotal();
  document.querySelectorAll('#section-fixed input').forEach(el => el.addEventListener('input', updateFixedTotal));
}

function updateFixedTotal() {
  const keys = ['rent','mgmt','utility','telecom','insurance','car','transport','education','subscription','other'];
  const total = keys.reduce((a, k) => a + num('fixed-' + k), 0);
  document.getElementById('total-fixed-calc').textContent = fmt(total);
}

function saveFixed() {
  ['rent','mgmt','utility','telecom','insurance','car','transport','education','subscription','other'].forEach(k => {
    state.fixed[k] = num('fixed-' + k);
  });
}

/* === Section: Spending === */
const SPEND_LABELS = {
  food:'식비', delivery:'배달', cafe:'카페', shopping:'쇼핑',
  coupang:'쿠팡', household:'생활용품', culture:'문화', travel:'여행',
  clothes:'의류', medical:'병원', other:'기타'
};
const SPEND_COLORS = ['#6c63ff','#4ecdc4','#f1c40f','#e74c3c','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e63','#3498db','#95a5a6'];
const SPEND_WARNINGS = { delivery: 8, shopping: 12, cafe: 5, coupang: 10, clothes: 8 };

function initSpending() {
  Object.keys(state.spending).forEach(k => setVal('spend-' + k, state.spending[k] || ''));
  updateSpendingTotal();
  document.querySelectorAll('#section-spending input').forEach(el => el.addEventListener('input', updateSpendingTotal));
}

function updateSpendingTotal() {
  const total = Object.keys(state.spending).reduce((a, k) => a + num('spend-' + k), 0);
  document.getElementById('total-spending-calc').textContent = fmt(total);
  renderSpendingAnalysis();
}

function saveSpending() {
  Object.keys(state.spending).forEach(k => { state.spending[k] = num('spend-' + k); });
}

function renderSpendingAnalysis() {
  const keys = Object.keys(state.spending);
  const values = keys.map(k => num('spend-' + k));
  const totalIncome = calcTotalMonthlyIncome() || 1;
  const totalSpend = values.reduce((a, b) => a + b, 0);
  if (totalSpend === 0) { document.getElementById('spending-analysis-card').style.display = 'none'; return; }
  document.getElementById('spending-analysis-card').style.display = '';

  document.getElementById('spending-analysis').innerHTML = keys.map((k, i) => {
    const v = values[i];
    if (!v) return '';
    const pct = (v / totalIncome * 100).toFixed(1);
    const barPct = (v / totalSpend * 100).toFixed(1);
    const warned = SPEND_WARNINGS[k] && (v / totalIncome * 100) > SPEND_WARNINGS[k];
    return `<div class="spend-bar-item">
      <span class="spend-bar-label">${SPEND_LABELS[k]}</span>
      <div class="spend-bar-track"><div class="spend-bar-fill" style="width:${barPct}%;background:${SPEND_COLORS[i]}"></div></div>
      <span class="spend-bar-pct" style="color:${warned ? '#e74c3c' : '#e8eaf0'}">${pct}%</span>
      ${warned ? '<span class="spend-warn">↑ 높음</span>' : ''}
    </div>`;
  }).join('');

  const ctx = document.getElementById('chart-spending').getContext('2d');
  const nonZero = keys.map((k, i) => ({ label: SPEND_LABELS[k], value: values[i], color: SPEND_COLORS[i] })).filter(x => x.value > 0);
  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: nonZero.map(x => x.label),
      datasets: [{ data: nonZero.map(x => x.value), backgroundColor: nonZero.map(x => x.color), borderWidth: 0 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#8890b0', font: { size: 12 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmt(ctx.parsed) } }
      },
      cutout: '65%',
    }
  });
}

/* === Section: Income === */
function initIncome() {
  Object.keys(state.income).forEach(k => setVal('income-' + k, state.income[k] || ''));
  updateIncomeCalc();
  document.querySelectorAll('#section-income input').forEach(el => el.addEventListener('input', updateIncomeCalc));
}

function updateIncomeCalc() {
  const avg = calcMonthlyIncomeFromIncomeSection();
  const min = num('income-salary') + num('income-business') + num('income-side') + num('income-rent') + num('income-other');
  const max = min + num('income-bonus');
  document.getElementById('income-avg').textContent = fmt(avg);
  document.getElementById('income-min').textContent = fmt(min);
  document.getElementById('income-max').textContent = fmt(max);
}

function saveIncome() {
  ['salary','bonus','business','side','rent','other'].forEach(k => { state.income[k] = num('income-' + k); });
}

/* === Section: Goals === */
const GOAL_LABELS = {
  jeonse:'🏠 전세', wedding:'💍 결혼', baby:'👶 출산', house:'🏡 내집마련',
  newcar:'🚗 차량교체', payloan:'💳 대출상환', '100m':'💯 1억 만들기', retire:'🌴 조기은퇴'
};

function initGoals() {
  const selected = state.goals.selected || [];
  document.querySelectorAll('#goals-grid input[type="checkbox"]').forEach(cb => {
    cb.checked = selected.includes(cb.value);
    cb.addEventListener('change', renderGoalDetails);
  });
  renderGoalDetails();
}

function renderGoalDetails() {
  const selected = Array.from(document.querySelectorAll('#goals-grid input:checked')).map(cb => cb.value);
  const container = document.getElementById('goal-details');
  container.innerHTML = selected.map(g => {
    const d = state.goals.details[g] || {};
    return `<div class="goal-detail-item">
      <h4>${GOAL_LABELS[g]}</h4>
      <div class="form-grid">
        <div class="form-group"><label>목표 금액 (만원)</label>
          <input type="number" id="goal-${g}-amount" value="${d.amount || ''}" placeholder="5000" /></div>
        <div class="form-group"><label>목표 기간 (개월)</label>
          <input type="number" id="goal-${g}-months" value="${d.months || ''}" placeholder="24" /></div>
      </div>
    </div>`;
  }).join('');
}

function saveGoals() {
  const selected = Array.from(document.querySelectorAll('#goals-grid input:checked')).map(cb => cb.value);
  const details = {};
  selected.forEach(g => {
    details[g] = {
      amount: parseFloat(document.getElementById(`goal-${g}-amount`)?.value) || 0,
      months: parseInt(document.getElementById(`goal-${g}-months`)?.value) || 0,
    };
  });
  state.goals = { selected, details };
}

/* === Monthly Tracking === */
function getCurrentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function saveMonthlyRecord() {
  const ym = getCurrentYM();
  const existing = state.monthlyRecords.findIndex(r => r.ym === ym);
  const record = {
    ym,
    netWorth: Math.round(calcNetWorth()),
    totalLoans: Math.round(calcTotalLoans()),
    totalAssets: Math.round(calcTotalAssets()),
    monthlyInterest: Math.round(calcTotalMonthlyInterest()),
    cashflow: Math.round(calcCashflow()),
    totalSpend: Math.round(calcTotalSpending()),
    savedAt: Date.now(),
  };

  if (existing >= 0) {
    if (!confirm(`${ym} 기록이 이미 있습니다. 덮어씌울까요?`)) return;
    state.monthlyRecords[existing] = record;
  } else {
    state.monthlyRecords.push(record);
    state.monthlyRecords.sort((a, b) => a.ym.localeCompare(b.ym));
  }

  saveState();
  showToast(`${ym} 기록이 저장되었습니다!`, 'success');
  refreshMonthlySection();
  refreshDashboard();
}

function deleteMonthlyRecord(ym) {
  state.monthlyRecords = state.monthlyRecords.filter(r => r.ym !== ym);
  saveState();
  refreshMonthlySection();
  refreshDashboard();
}

function refreshMonthlySection() {
  // Preview
  const ym = getCurrentYM();
  const netWorth = calcNetWorth();
  const cashflow = calcCashflow();
  const totalLoans = calcTotalLoans();
  document.getElementById('monthly-preview').innerHTML =
    `<strong>${ym}</strong> &nbsp;|&nbsp; 순자산 <strong style="color:${netWorth >= 0 ? '#2ecc71' : '#e74c3c'}">${fmt(Math.round(netWorth))}</strong> &nbsp;|&nbsp; 대출 <strong style="color:#e74c3c">${fmt(Math.round(totalLoans))}</strong> &nbsp;|&nbsp; 현금흐름 <strong style="color:${cashflow >= 0 ? '#2ecc71' : '#e74c3c'}">${fmt(Math.round(cashflow))}</strong>`;

  // Table
  const records = state.monthlyRecords;
  const listEl = document.getElementById('monthly-records-list');

  if (!records.length) {
    listEl.innerHTML = '<div class="monthly-empty">아직 기록이 없습니다. 첫 달 기록을 저장해보세요!</div>';
  } else {
    listEl.innerHTML = `<table class="monthly-table">
      <thead>
        <tr>
          <th>월</th>
          <th>순자산</th>
          <th>전월 대비</th>
          <th>대출 잔액</th>
          <th>월 이자</th>
          <th>현금흐름</th>
          <th>소비 합계</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${records.map((r, i) => {
          const prev = records[i - 1];
          const diff = prev ? r.netWorth - prev.netWorth : null;
          const diffHtml = diff === null ? '<span class="flat">-</span>'
            : diff > 0 ? `<span class="up">▲ +${fmt(diff)}</span>`
            : diff < 0 ? `<span class="down">▼ ${fmt(diff)}</span>`
            : `<span class="flat">→ 0</span>`;
          return `<tr>
            <td class="month-label">${r.ym}</td>
            <td style="color:${r.netWorth >= 0 ? '#2ecc71' : '#e74c3c'};font-weight:600">${fmt(r.netWorth)}</td>
            <td>${diffHtml}</td>
            <td class="down">${fmt(r.totalLoans)}</td>
            <td class="down">${fmt(r.monthlyInterest)}</td>
            <td style="color:${r.cashflow >= 0 ? '#2ecc71' : '#e74c3c'}">${fmt(r.cashflow)}</td>
            <td>${fmt(r.totalSpend)}</td>
            <td><button class="btn-del-month" onclick="deleteMonthlyRecord('${r.ym}')" title="삭제">×</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  // Chart
  drawMonthlyChart();
}

function drawMonthlyChart() {
  const ctx = document.getElementById('chart-monthly').getContext('2d');
  const records = state.monthlyRecords;
  if (monthlyChart) monthlyChart.destroy();
  if (records.length === 0) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: records.map(r => r.ym),
      datasets: [
        {
          label: '순자산',
          data: records.map(r => r.netWorth),
          backgroundColor: records.map(r => r.netWorth >= 0 ? 'rgba(78,205,196,0.7)' : 'rgba(231,76,60,0.6)'),
          borderRadius: 6,
          borderSkipped: false,
          order: 1,
        },
        {
          label: '대출 잔액',
          data: records.map(r => -r.totalLoans),
          backgroundColor: 'rgba(231,76,60,0.2)',
          borderRadius: 6,
          borderSkipped: false,
          order: 2,
        },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8890b0', font: { size: 12 }, boxWidth: 14 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtN(Math.abs(ctx.parsed.y)) + ' 만원' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8890b0' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8890b0', callback: v => fmtN(v) } }
      }
    }
  });
}

/* === Simulation === */
function updateSimLoanSelect() {
  const sel = document.getElementById('sim-loan-select');
  if (!sel) return;
  sel.innerHTML = state.loans.length
    ? state.loans.map((l, i) => `<option value="${i}">${l.name} (${l.rate}%)</option>`).join('')
    : '<option>대출 없음</option>';
}

function runSimRepay() {
  const idx = parseInt(document.getElementById('sim-loan-select').value);
  const amount = num('sim-repay-amount');
  const result = document.getElementById('sim-repay-result');
  if (!state.loans[idx] || !amount) { result.textContent = '값을 입력하세요.'; result.className = 'sim-result show'; return; }

  const loan = state.loans[idx];
  const newPrincipal = Math.max(0, (parseFloat(loan.principal) || 0) - amount);
  const oldMI = calcLoanMonthlyInterest(loan);
  const newMI = (newPrincipal * (parseFloat(loan.rate) || 0) / 100) / 12;
  const savedMonthly = oldMI - newMI;

  result.innerHTML = `<strong>${loan.name} 상환 시뮬레이션</strong>
현금 감소: <span style="color:var(--red)">-${fmt(amount)}</span>
월 이자 절감: <span style="color:var(--green)">+${fmtK(savedMonthly)}</span>
연간 이자 절약: <span style="color:var(--green)">+${fmtK(savedMonthly * 12)}</span>
순자산: 변동 없음 (대출↓ 현금↓ 동시)
현금흐름 개선: <span style="color:var(--green)">+${fmtK(savedMonthly)}/월</span>`;
  result.className = 'sim-result show';
}

function runSimSave() {
  const cat = document.getElementById('sim-spend-category').value;
  const amount = num('sim-save-amount');
  const years = num('sim-save-years') || 3;
  const result = document.getElementById('sim-save-result');

  const totalSaved = amount * 12 * years;
  const withInterest = totalSaved * (1 + 0.035 * years);

  result.innerHTML = `<strong>${SPEND_LABELS[cat]} ${fmtK(amount)} 절감 시 ${years}년 효과</strong>
월 현금흐름 개선: <span style="color:var(--green)">+${fmtK(amount)}</span>
누적 절감: <span style="color:var(--green)">${fmtK(Math.round(totalSaved))}</span>
예금 이자 포함 (3.5%): <span style="color:var(--green)">${fmtK(Math.round(withInterest))}</span>`;
  result.className = 'sim-result show';
}

function runSimSell() {
  const asset = document.getElementById('sim-sell-asset').value;
  const amount = num('sim-sell-amount');
  const use = document.getElementById('sim-sell-use').value;
  const result = document.getElementById('sim-sell-result');
  const assetLabels = { car:'자동차', stocks:'주식', etf:'ETF', crypto:'코인' };
  const useLabels = { loan:'대출 상환', savings:'저축', invest:'재투자' };

  let effect = '';
  if (use === 'loan') {
    const sortedLoans = [...state.loans].sort((a, b) => b.rate - a.rate);
    if (sortedLoans.length) {
      const topLoan = sortedLoans[0];
      const repayAmt = Math.min(amount, parseFloat(topLoan.principal) || 0);
      const savedMI = (repayAmt * (parseFloat(topLoan.rate) || 0) / 100) / 12;
      effect = `→ 최고금리 "${topLoan.name}" (${topLoan.rate}%) 상환 추천\n월 이자 절감: <span style="color:var(--green)">+${fmtK(savedMI)}</span>\n순자산: 변동 없음`;
    }
  } else if (use === 'savings') {
    effect = `예금 이자: <span style="color:var(--green)">+${fmtK(amount * 0.035 / 12)}/월</span>\n순자산 구성 변경 (자산 이동)`;
  } else {
    effect = `기대수익은 투자 결과에 따라 다름\n순자산 구성 변경`;
  }

  result.innerHTML = `<strong>${assetLabels[asset]} ${fmt(amount)} 매각 → ${useLabels[use]}</strong>
${effect}`;
  result.className = 'sim-result show';
}

/* === AI === */
function getApiKey() { return localStorage.getItem('claude_api_key') || ''; }

function saveApiKey() {
  const key = document.getElementById('input-api-key').value.trim();
  if (!key || !key.startsWith('sk-ant-')) { showToast('올바른 API 키를 입력하세요 (sk-ant-...)', 'error'); return; }
  localStorage.setItem('claude_api_key', key);
  document.getElementById('ai-api-key-area').style.display = 'none';
  showToast('API 키가 저장되었습니다.', 'success');
}

async function callClaude(prompt) {
  const key = getApiKey();
  if (!key) throw new Error('API 키가 없습니다.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  return (await response.json()).content[0].text;
}

function buildFinancialContext() {
  const totalAssets = calcTotalAssets();
  const totalLoans = calcTotalLoans();
  const netWorth = calcNetWorth();
  const totalIncome = calcTotalMonthlyIncome();
  const totalFixed = calcTotalFixed();
  const totalSpend = calcTotalSpending();
  const totalInterest = calcTotalMonthlyInterest();
  const cashflow = calcCashflow();

  const loanList = state.loans.map(l =>
    `- ${l.name}: 원금 ${l.principal}만원, 금리 ${l.rate}%, 월원금 ${l.monthlyPrincipal}만원, 월이자 ${Math.round(calcLoanMonthlyInterest(l) * 10) / 10}만원`
  ).join('\n');
  const goalList = (state.goals.selected || []).map(g => {
    const d = state.goals.details[g] || {};
    return `- ${GOAL_LABELS[g]}: 목표 ${d.amount || '?'}만원, ${d.months || '?'}개월`;
  }).join('\n');
  const spendList = Object.entries(state.spending).filter(([,v]) => v > 0).map(([k,v]) =>
    `- ${SPEND_LABELS[k]}: ${v}만원 (수입대비 ${totalIncome > 0 ? (v/totalIncome*100).toFixed(1) : '-'}%)`
  ).join('\n');
  const monthlyHistory = state.monthlyRecords.length
    ? state.monthlyRecords.slice(-3).map(r => `- ${r.ym}: 순자산 ${r.netWorth}만원, 대출 ${r.totalLoans}만원`).join('\n')
    : '기록 없음';

  return `[재무 현황]
- 순자산: ${Math.round(netWorth)}만원 / 총 자산: ${Math.round(totalAssets)}만원 / 총 대출: ${Math.round(totalLoans)}만원
- 월 수입 합계: ${Math.round(totalIncome)}만원 (기본정보 기준)
- 월 고정비: ${Math.round(totalFixed)}만원 / 월 소비: ${Math.round(totalSpend)}만원 / 월 이자: ${Math.round(totalInterest)}만원
- 월 현금흐름: ${Math.round(cashflow)}만원

[대출 목록 - 총 ${state.loans.length}건]
${loanList || '없음'}

[소비 패턴]
${spendList || '미입력'}

[재무 목표]
${goalList || '없음'}

[최근 3개월 기록]
${monthlyHistory}`.trim();
}

async function runAIAnalysis() {
  const btn = document.getElementById('btn-ai-analyze');
  const resultEl = document.getElementById('ai-result');
  btn.disabled = true; btn.textContent = '분석 중...';
  resultEl.innerHTML = '<span class="loading-dots">분석하는 중</span>';
  try {
    const result = await callClaude(`당신은 한국 가계 재무 전문가입니다. 아래 재무 현황을 분석하고 실용적인 조언을 한국어로 제공해주세요.

${buildFinancialContext()}

다음 항목을 분석해주세요:
1. 현재 재무 상태 진단 (순자산, 부채비율, 현금흐름)
2. 가장 시급한 개선 포인트 2-3가지
3. 대출 상환 우선순위 추천 (금리 높은 순으로 구체적으로)
4. 소비 패턴에서 절약 가능한 부분
5. 목표 달성 예상 기간 및 전략

간결하고 실용적으로, 마크다운 없이 번호와 들여쓰기로 작성해주세요.`);
    resultEl.textContent = result;
  } catch (e) {
    resultEl.innerHTML = `<span style="color:var(--red)">오류: ${e.message}</span>`;
  } finally {
    btn.disabled = false; btn.textContent = '분석 시작';
  }
}

async function runAICoach() {
  const btn = document.getElementById('btn-ai-coach');
  const resultEl = document.getElementById('coach-result');
  btn.disabled = true; btn.textContent = '코칭 중...';
  resultEl.innerHTML = '<span class="loading-dots">코칭 준비 중</span>';
  try {
    const goals = (state.goals.selected || []).map(g => {
      const d = state.goals.details[g] || {};
      return `${GOAL_LABELS[g]} (${d.amount || '?'}만원, ${d.months || '?'}개월)`;
    }).join(', ') || '목표 미입력';
    const result = await callClaude(`당신은 한국 가계 재무 코치입니다. 아래 재무 현황과 목표를 바탕으로 맞춤 전략을 제시해주세요.

${buildFinancialContext()}

목표: ${goals}

다음을 포함해서 코칭해주세요:
1. 현재 월 저축 가능액과 목표 달성 예상 시기
2. 당장 바꿔야 할 것 3가지 (구체적 금액 포함)
3. 6개월 실행 계획 (월별 액션 포함)
4. 응원 메시지 한 줄

친근하고 따뜻한 톤으로, 마크다운 없이 작성해주세요.`);
    resultEl.textContent = result;
  } catch (e) {
    resultEl.innerHTML = `<span style="color:var(--red)">오류: ${e.message}</span>`;
  } finally {
    btn.disabled = false; btn.textContent = '코칭 받기';
  }
}

/* === Save Buttons === */
function initSaveButtons() {
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section === 'basic') saveBasic();
      else if (section === 'assets') saveAssets();
      else if (section === 'loans') { /* loans auto-saved on field change */ }
      else if (section === 'fixed') saveFixed();
      else if (section === 'spending') saveSpending();
      else if (section === 'income') saveIncome();
      else if (section === 'goals') saveGoals();
      saveState();
      showToast('저장되었습니다 ✓', 'success');
    });
  });
}

/* === Share & Reset === */
function initShare() {
  document.getElementById('btn-share').addEventListener('click', () => {
    saveBasic(); saveAssets(); saveFixed(); saveSpending(); saveIncome(); saveGoals();
    saveState();
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('링크 복사 완료! 배우자에게 공유하세요.', 'success'))
      .catch(() => prompt('아래 링크를 복사하세요:', window.location.href));
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?\n(대출 데이터도 초기화됩니다)')) {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem('claude_api_key');
      history.replaceState(null, '', window.location.pathname);
      location.reload();
    }
  });
}

/* === API Key Init === */
function initApiKey() {
  document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
  document.getElementById('btn-ai-analyze').addEventListener('click', runAIAnalysis);
  document.getElementById('btn-ai-coach').addEventListener('click', runAICoach);
  if (getApiKey()) document.getElementById('ai-api-key-area').style.display = 'none';
}

/* === Toast === */
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/* === Init === */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNav();
  initBasic();
  initAssets();
  renderLoans();
  document.getElementById('btn-add-loan').addEventListener('click', addLoan);
  initFixed();
  initSpending();
  initIncome();
  initGoals();
  initSaveButtons();
  initShare();
  initApiKey();
  document.getElementById('btn-save-monthly').addEventListener('click', saveMonthlyRecord);
  refreshDashboard();
  refreshMonthlySection();
});

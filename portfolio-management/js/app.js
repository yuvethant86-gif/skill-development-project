const state = loadPortfolioState();
const navButtons = document.querySelectorAll('.nav-link');
const appShell = document.querySelector('.app-shell');

function renderDashboard() {
  const metrics = calculatePortfolioMetrics(state);

  document.getElementById('portfolio-value').textContent = formatCurrency(metrics.portfolioValue);
  document.getElementById('cash-balance').textContent = formatCurrency(state.balance);
  document.getElementById('invested-amount').textContent = formatCurrency(metrics.totalInvestedAmount);
  document.getElementById('total-pnl').textContent = formatSignedCurrency(metrics.totalProfitLoss);

  document.getElementById('portfolio-change').textContent = `Current market value ${formatCurrency(metrics.currentMarketValue)}`;
  document.getElementById('cash-note').textContent = `Cash reserve ${formatCurrency(state.balance)}`;
  document.getElementById('invested-note').textContent = `Cost basis ${formatCurrency(metrics.totalInvestedAmount)}`;
  document.getElementById('pnl-note').textContent = `Unrealized ${formatSignedCurrency(metrics.unrealizedProfitLoss)} | Realized ${formatSignedCurrency(metrics.realizedProfitLoss)}`;

  document.getElementById('unrealized-pnl').textContent = formatSignedCurrency(metrics.unrealizedProfitLoss);
  document.getElementById('realized-pnl').textContent = formatSignedCurrency(metrics.realizedProfitLoss);
  document.getElementById('portfolio-return').textContent = `${metrics.portfolioReturn.toFixed(2)}%`;
  document.getElementById('current-date').textContent = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());
  document.getElementById('total-pnl').classList.toggle('positive', metrics.totalProfitLoss >= 0);
  document.getElementById('total-pnl').classList.toggle('negative', metrics.totalProfitLoss < 0);
  document.getElementById('unrealized-pnl').classList.toggle('positive', metrics.unrealizedProfitLoss >= 0);
  document.getElementById('unrealized-pnl').classList.toggle('negative', metrics.unrealizedProfitLoss < 0);
  document.getElementById('realized-pnl').classList.toggle('positive', metrics.realizedProfitLoss >= 0);
  document.getElementById('realized-pnl').classList.toggle('negative', metrics.realizedProfitLoss < 0);

  renderPerformanceChart(metrics);

  const allocationList = document.getElementById('allocation-list');
  const allocations = getAllocationData(state.holdings);
  let allocationStart = 0;
  const allocationStops = allocations.map((item, index) => {
    const color = ['#8b72ff', '#42a5f5', '#36d399', '#f4bd50', '#ef7294', '#61c5c7'][index % 6];
    const nextStop = allocationStart + (item.percentage * 3.6);
    const stop = `${color} ${allocationStart}deg ${nextStop}deg`;
    allocationStart = nextStop;
    return stop;
  });
  const donut = document.getElementById('allocation-donut');
  donut.style.background = allocationStops.length
    ? `conic-gradient(${allocationStops.join(', ')})`
    : 'conic-gradient(#293448 0deg 360deg)';
  donut.setAttribute('aria-label', allocations.length
    ? `Portfolio allocation across ${allocations.length} holdings`
    : 'No portfolio holdings');
  allocationList.innerHTML = allocations.length
    ? allocations.map((item, index) => `
      <div class="allocation-item">
        <div class="allocation-row">
          <span><i class="allocation-dot" style="--allocation-color: ${['#8b72ff', '#42a5f5', '#36d399', '#f4bd50', '#ef7294', '#61c5c7'][index % 6]}" aria-hidden="true"></i>${item.company}</span>
          <strong>${formatCurrency(item.value)}</strong>
        </div>
        <div class="progress-bar">
          <span class="progress-fill" style="width: ${Math.min(item.percentage, 100)}%"></span>
        </div>
        <div class="allocation-row allocation-percent-row">
          <span>Portfolio share</span>
          <strong class="allocation-percent">${item.percentage.toFixed(1)}%</strong>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state">No active holdings yet.</div>';

  const recentTransactions = getRecentTransactions(state.transactions, 5);
  const recentList = document.getElementById('recent-transactions');
  recentList.innerHTML = recentTransactions.length
    ? recentTransactions.map((entry) => `
      <div class="mini-metric">
        <span><b class="transaction-type ${entry.type.toLowerCase()}">${entry.type}</b> ${entry.symbol} <small>· ${entry.quantity} shares</small></span>
        <strong>${formatCurrency(entry.amount)}</strong>
      </div>
    `).join('')
    : '<div class="empty-state">No recent transactions.</div>';
}

function renderPerformanceChart(metrics) {
  const chart = document.getElementById('performance-chart');
  const largestValue = Math.max(metrics.currentMarketValue, metrics.totalInvestedAmount, 1);
  const marketWidth = (metrics.currentMarketValue / largestValue) * 100;
  const investedWidth = (metrics.totalInvestedAmount / largestValue) * 100;

  chart.innerHTML = `
    <div>
      <div class="chart-value-row"><span>Current market value</span><strong>${formatCurrency(metrics.currentMarketValue)}</strong></div>
      <div class="chart-track"><span class="chart-bar" style="width:${marketWidth}%"></span></div>
    </div>
    <div>
      <div class="chart-value-row"><span>Remaining cost basis</span><strong>${formatCurrency(metrics.totalInvestedAmount)}</strong></div>
      <div class="chart-track"><span class="chart-bar cost" style="width:${investedWidth}%"></span></div>
    </div>
    <p class="chart-caption">Snapshot of your holdings using fixed illustrative sample prices; not historical or live performance.</p>
  `;
}

function renderBalanceSection() {
  document.getElementById('initial-balance').textContent = formatCurrency(state.initialBalance);
  document.getElementById('current-balance').textContent = formatCurrency(state.balance);
  document.getElementById('total-spent').textContent = formatCurrency(state.totalSpent);
  document.getElementById('total-received').textContent = formatCurrency(state.totalReceived);
}

function renderHoldings() {
  const searchInput = document.getElementById('holdings-search');
  const sortSelect = document.getElementById('holdings-sort');
  const rows = [...state.holdings];
  const searchValue = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const sortValue = sortSelect ? sortSelect.value : 'symbol-asc';

  const filtered = rows.filter((holding) => {
    const term = `${holding.company} ${holding.symbol}`.toLowerCase();
    return term.includes(searchValue);
  });

  filtered.sort((a, b) => {
    const stockA = getStockBySymbol(a.symbol);
    const stockB = getStockBySymbol(b.symbol);
    const marketValueA = a.shares * (stockA ? stockA.price : 0);
    const marketValueB = b.shares * (stockB ? stockB.price : 0);
    const pnlA = (stockA ? stockA.price : 0) * a.shares - a.shares * a.avgPrice;
    const pnlB = (stockB ? stockB.price : 0) * b.shares - b.shares * b.avgPrice;

    switch (sortValue) {
      case 'value-desc':
        return marketValueB - marketValueA;
      case 'pnl-desc':
        return pnlB - pnlA;
      default:
        return a.symbol.localeCompare(b.symbol);
    }
  });

  const tbody = document.getElementById('holdings-table-body');
  tbody.innerHTML = filtered.length
    ? filtered.map((holding) => {
        const stock = getStockBySymbol(holding.symbol);
        const currentPrice = stock ? stock.price : 0;
        const investedValue = holding.shares * holding.avgPrice;
        const marketValue = holding.shares * currentPrice;
        const pnl = marketValue - investedValue;
        const percent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

        return `
          <tr>
            <td>
              <div class="company-cell">
                <span>${holding.company}</span>
              </div>
            </td>
            <td>${holding.symbol}</td>
            <td>${holding.shares}</td>
            <td>${formatCurrency(holding.avgPrice)}</td>
            <td>${formatCurrency(currentPrice)}</td>
            <td>${formatCurrency(investedValue)}</td>
            <td>${formatCurrency(marketValue)}</td>
            <td class="${pnl >= 0 ? 'positive' : 'negative'}">${formatSignedCurrency(pnl)}</td>
            <td class="${percent >= 0 ? 'positive' : 'negative'}">${formatSignedPercent(percent)}</td>
            <td>
              <button class="action-btn" type="button" data-sell-symbol="${holding.symbol}">Sell</button>
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="10"><div class="empty-state">No holdings match your current search.</div></td></tr>';

}

function renderRecommendations() {
  const recommendationList = document.getElementById('recommendation-list');
  const recommendations = [
    { company: 'TCS', symbol: 'TCS', price: 3600, rating: 'Buy', explanation: 'Strong digital service demand and predictable earnings profile in the IT sector.' },
    { company: 'Infosys', symbol: 'INFY', price: 1550, rating: 'Hold', explanation: 'Balanced large-cap exposure with steady execution quality and moderate valuation.' },
    { company: 'Reliance Industries', symbol: 'RELIANCE', price: 2450, rating: 'Buy', explanation: 'Diversified business operations supported by energy, telecom, and digital growth.' },
    { company: 'HDFC Bank', symbol: 'HDFCBANK', price: 1700, rating: 'Watch', explanation: 'Consistent banking franchise with decent growth potential, but valuation should be watched.' },
    { company: 'Wipro', symbol: 'WIPRO', price: 550, rating: 'Hold', explanation: 'Defensive technology holding with stable business fundamentals and measured upside.' },
    { company: 'ITC', symbol: 'ITC', price: 450, rating: 'Watch', explanation: 'Consumer staples exposure with resilient cash flows and moderate growth potential.' }
  ];

  recommendationList.innerHTML = recommendations.map((item) => `
    <article class="recommendation-card">
      <div class="recommendation-header">
        <div class="company-meta">
          <h4>${item.company}</h4>
        </div>
        <span class="symbol-tag">${item.symbol}</span>
      </div>
      <div class="price-row">
        <span>Sample price</span>
        <strong>${formatCurrency(item.price)}</strong>
      </div>
      <div class="price-row">
        <span>Recommendation</span>
        <span class="variant-badge ${item.rating.toLowerCase()}">${item.rating}</span>
      </div>
      <p>${item.explanation}</p>
      <p class="recommendation-detail" hidden>Sample prices and labels are fixed educational examples. They do not reflect a live market view or personalized investment advice.</p>
      <div class="recommendation-actions">
        <button class="btn btn-outline-primary" type="button" data-recommendation-details="${item.symbol}" aria-expanded="false">View details</button>
        <button class="btn btn-primary" type="button" data-buy-stock="${item.symbol}"><i class="bi bi-plus-circle" aria-hidden="true"></i> Simulate buy</button>
      </div>
    </article>
  `).join('');
}

function renderTradeForms() {
  const buySelect = document.getElementById('buy-stock-select');
  const sellSelect = document.getElementById('sell-stock-select');

  buySelect.innerHTML = STOCKS.map((stock) => `
    <option value="${stock.symbol}">${stock.company} (${stock.symbol})</option>
  `).join('');

  const holdings = state.holdings;
  if (holdings.length === 0) {
    sellSelect.innerHTML = '<option value="">No holdings available</option>';
  } else {
    sellSelect.innerHTML = holdings.map((holding) => `
      <option value="${holding.symbol}">${holding.company} (${holding.symbol})</option>
    `).join('');
  }

  const buyStock = buySelect.value || 'TCS';
  const sellStock = sellSelect.value || (holdings[0] ? holdings[0].symbol : '');

  buySelect.value = buyStock;
  sellSelect.value = sellStock;

  updateBuyForm();
  updateSellForm();
}

function renderHistory() {
  const tbody = document.getElementById('history-table-body');
  const searchTerm = document.getElementById('history-search').value.trim().toLowerCase();
  const typeFilter = document.getElementById('history-type-filter').value;
  const filteredTransactions = state.transactions.filter((entry) => {
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    const searchable = `${entry.company} ${entry.symbol} ${entry.type} ${entry.quantity}`.toLowerCase();
    return matchesType && searchable.includes(searchTerm);
  });

  tbody.innerHTML = filteredTransactions.length
    ? filteredTransactions.map((entry) => `
      <tr>
        <td>${new Date(entry.date).toLocaleString('en-IN')}</td>
        <td>${entry.company} (${entry.symbol})</td>
        <td><span class="transaction-type ${entry.type.toLowerCase()}">${entry.type}</span></td>
        <td>${entry.quantity}</td>
        <td>${formatCurrency(entry.price)}</td>
        <td>${formatCurrency(entry.amount)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="6"><div class="empty-state">${state.transactions.length ? 'No transactions match your filters.' : 'No transactions recorded yet.'}</div></td></tr>`;
}

function updateBuyForm() {
  const select = document.getElementById('buy-stock-select');
  const quantityInput = document.getElementById('buy-quantity');
  const priceBox = document.getElementById('buy-price');
  const totalBox = document.getElementById('buy-total');
  const stock = getStockBySymbol(select.value);
  const quantity = Number(quantityInput.value || 0);
  const total = stock ? stock.price * quantity : 0;

  priceBox.textContent = stock ? formatCurrency(stock.price) : '₹0';
  totalBox.textContent = formatCurrency(total);
  document.getElementById('buy-available-balance').textContent = formatCurrency(state.balance);
}

function updateSellForm() {
  const select = document.getElementById('sell-stock-select');
  const quantityInput = document.getElementById('sell-quantity');
  const priceBox = document.getElementById('sell-price');
  const totalBox = document.getElementById('sell-total');
  const stock = getStockBySymbol(select.value);
  const quantity = Number(quantityInput.value || 0);
  const total = stock ? stock.price * quantity : 0;

  priceBox.textContent = stock ? formatCurrency(stock.price) : '₹0';
  totalBox.textContent = formatCurrency(total);
  const holding = state.holdings.find((item) => item.symbol === select.value);
  document.getElementById('sell-shares-owned').textContent = holding ? holding.shares : '0';
}

function setFormMessage(elementId, message, type = '') {
  const box = document.getElementById(elementId);
  box.textContent = message;
  box.className = `form-message ${type}`.trim();
}

function showToast(message, type = 'success') {
  const wrapper = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrapper.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function showSection(targetId) {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach((section) => {
    section.classList.toggle('active', section.id === targetId);
  });

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === targetId);
  });
  closeMobileNavigation();
}

function setTradeTab(tabName) {
  document.querySelectorAll('[data-trade-tab]').forEach((button) => {
    const isActive = button.dataset.tradeTab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('[data-trade-panel]').forEach((panel) => {
    const isActive = panel.dataset.tradePanel === tabName;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
}

function closeMobileNavigation() {
  appShell.classList.remove('mobile-nav-open');
  document.body.classList.remove('mobile-nav-open');
  document.getElementById('mobile-menu-toggle').setAttribute('aria-expanded', 'false');
}

function handleAppClick(event) {
  const sellButton = event.target.closest('[data-sell-symbol]');
  if (sellButton) {
    showSection('trade');
    setTradeTab('sell');
    const sellSelect = document.getElementById('sell-stock-select');
    sellSelect.value = sellButton.dataset.sellSymbol;
    updateSellForm();
    return;
  }

  const buyButton = event.target.closest('[data-buy-stock]');
  if (buyButton) {
    showSection('trade');
    setTradeTab('buy');
    const buySelect = document.getElementById('buy-stock-select');
    buySelect.value = buyButton.dataset.buyStock;
    updateBuyForm();
    return;
  }

  const sellQuickAction = event.target.closest('[data-sell-first-holding]');
  if (sellQuickAction) {
    showSection('trade');
    setTradeTab('sell');
    if (state.holdings.length) {
      document.getElementById('sell-stock-select').value = state.holdings[0].symbol;
      updateSellForm();
    } else {
      showToast('There are no holdings to sell.', 'error');
    }
    return;
  }

  const detailsButton = event.target.closest('[data-recommendation-details]');
  if (detailsButton) {
    const expanded = detailsButton.getAttribute('aria-expanded') === 'true';
    detailsButton.setAttribute('aria-expanded', String(!expanded));
    const detail = detailsButton.closest('.recommendation-card').querySelector('.recommendation-detail');
    detail.hidden = expanded;
    detailsButton.textContent = expanded ? 'View details' : 'Hide details';
    return;
  }

  const goToButton = event.target.closest('[data-goto-section]');
  if (goToButton) {
    showSection(goToButton.dataset.gotoSection);
  }
}

function handleBuySubmit(event) {
  event.preventDefault();
  const stockSymbol = document.getElementById('buy-stock-select').value;
  const quantity = Number(document.getElementById('buy-quantity').value);
  const result = buyStock(state, stockSymbol, quantity);

  if (result.success) {
    savePortfolioState(state);
    renderAll();
    setFormMessage('buy-message', result.message, 'success');
    showToast(result.message, 'success');
    document.getElementById('buy-form').reset();
    updateBuyForm();
  } else {
    setFormMessage('buy-message', result.message, 'error');
    showToast(result.message, 'error');
  }
}

function handleSellSubmit(event) {
  event.preventDefault();
  const stockSymbol = document.getElementById('sell-stock-select').value;
  const quantity = Number(document.getElementById('sell-quantity').value);
  const result = sellStock(state, stockSymbol, quantity);

  if (result.success) {
    savePortfolioState(state);
    renderAll();
    setFormMessage('sell-message', result.message, 'success');
    showToast(result.message, 'success');
    document.getElementById('sell-form').reset();
    updateSellForm();
  } else {
    setFormMessage('sell-message', result.message, 'error');
    showToast(result.message, 'error');
  }
}

function handleResetData() {
  const confirmed = window.confirm('Reset the portfolio to the original demo state?');
  if (!confirmed) {
    return;
  }

  const freshState = resetPortfolioState();
  Object.assign(state, freshState);
  renderAll();
  showToast('Demo data has been reset successfully.', 'success');
}

function renderAll() {
  renderDashboard();
  renderBalanceSection();
  renderHoldings();
  renderRecommendations();
  renderTradeForms();
  renderHistory();
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.target));
  });

  document.addEventListener('click', handleAppClick);
  document.querySelectorAll('[data-trade-tab]').forEach((button) => {
    button.addEventListener('click', () => setTradeTab(button.dataset.tradeTab));
  });

  document.getElementById('buy-stock-select').addEventListener('change', updateBuyForm);
  document.getElementById('buy-quantity').addEventListener('input', updateBuyForm);
  document.getElementById('buy-form').addEventListener('submit', handleBuySubmit);

  document.getElementById('sell-stock-select').addEventListener('change', updateSellForm);
  document.getElementById('sell-quantity').addEventListener('input', updateSellForm);
  document.getElementById('sell-form').addEventListener('submit', handleSellSubmit);

  document.getElementById('holdings-search').addEventListener('input', renderHoldings);
  document.getElementById('holdings-sort').addEventListener('change', renderHoldings);
  document.getElementById('history-search').addEventListener('input', renderHistory);
  document.getElementById('history-type-filter').addEventListener('change', renderHistory);
  document.getElementById('reset-demo-btn').addEventListener('click', handleResetData);
  document.getElementById('sidebar-collapse').addEventListener('click', () => {
    const collapsed = appShell.classList.toggle('sidebar-collapsed');
    localStorage.setItem('portfolio-sidebar-collapsed', String(collapsed));
    const collapseButton = document.getElementById('sidebar-collapse');
    collapseButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseButton.setAttribute('aria-expanded', String(!collapsed));
    collapseButton.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  });
  document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    appShell.classList.add('mobile-nav-open');
    document.body.classList.add('mobile-nav-open');
    document.getElementById('mobile-menu-toggle').setAttribute('aria-expanded', 'true');
  });
  document.getElementById('sidebar-backdrop').addEventListener('click', closeMobileNavigation);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMobileNavigation();
    }
  });
}

function initializeApp() {
  if (localStorage.getItem('portfolio-sidebar-collapsed') === 'true') {
    appShell.classList.add('sidebar-collapsed');
    const collapseButton = document.getElementById('sidebar-collapse');
    collapseButton.setAttribute('aria-label', 'Expand sidebar');
    collapseButton.setAttribute('aria-expanded', 'false');
    collapseButton.title = 'Expand sidebar';
  }
  renderAll();
  bindEvents();
  setTradeTab('buy');
  setFormMessage('buy-message', '', '');
  setFormMessage('sell-message', '', '');
}

initializeApp();

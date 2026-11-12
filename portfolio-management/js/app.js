const state = loadPortfolioState();
const navButtons = document.querySelectorAll('.nav-link');
const selectedSection = document.getElementById('dashboard');

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

  const allocationList = document.getElementById('allocation-list');
  const allocations = getAllocationData(state.holdings);
  allocationList.innerHTML = allocations.length
    ? allocations.map((item) => `
      <div class="allocation-item">
        <div class="allocation-row">
          <span>${item.company}</span>
          <strong>${formatCurrency(item.value)}</strong>
        </div>
        <div class="progress-bar">
          <span class="progress-fill" style="width: ${Math.min(item.percentage, 100)}%"></span>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state">No active holdings yet.</div>';

  const recentTransactions = getRecentTransactions(state.transactions, 5);
  const recentList = document.getElementById('recent-transactions');
  recentList.innerHTML = recentTransactions.length
    ? recentTransactions.map((entry) => `
      <div class="mini-metric">
        <span>${entry.type === 'BUY' ? 'Bought' : 'Sold'} ${entry.symbol}</span>
        <strong>${formatSignedCurrency(entry.type === 'BUY' ? -entry.amount : entry.amount)}</strong>
      </div>
    `).join('')
    : '<div class="empty-state">No recent transactions.</div>';
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

  const sellButtons = document.querySelectorAll('[data-sell-symbol]');
  sellButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetSymbol = button.getAttribute('data-sell-symbol');
      showSection('trade');
      const sellSelect = document.getElementById('sell-stock-select');
      sellSelect.value = targetSymbol;
      updateSellForm();
    });
  });
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
      <button class="btn btn-primary" type="button" data-buy-stock="${item.symbol}">View / Buy</button>
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
  tbody.innerHTML = state.transactions.length
    ? state.transactions.map((entry) => `
      <tr>
        <td>${new Date(entry.date).toLocaleString('en-IN')}</td>
        <td>${entry.company} (${entry.symbol})</td>
        <td><span class="${entry.type === 'BUY' ? 'positive' : 'negative'}">${entry.type}</span></td>
        <td>${entry.quantity}</td>
        <td>${formatCurrency(entry.price)}</td>
        <td>${formatCurrency(entry.amount)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6"><div class="empty-state">No transactions recorded yet.</div></td></tr>';
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

  document.querySelectorAll('[data-buy-stock]').forEach((button) => {
    button.addEventListener('click', () => {
      const symbol = button.dataset.buyStock;
      showSection('trade');
      const buySelect = document.getElementById('buy-stock-select');
      buySelect.value = symbol;
      updateBuyForm();
    });
  });

  document.querySelectorAll('[data-goto-section]').forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.gotoSection));
  });

  document.getElementById('buy-stock-select').addEventListener('change', updateBuyForm);
  document.getElementById('buy-quantity').addEventListener('input', updateBuyForm);
  document.getElementById('buy-form').addEventListener('submit', handleBuySubmit);

  document.getElementById('sell-stock-select').addEventListener('change', updateSellForm);
  document.getElementById('sell-quantity').addEventListener('input', updateSellForm);
  document.getElementById('sell-form').addEventListener('submit', handleSellSubmit);

  document.getElementById('holdings-search').addEventListener('input', renderHoldings);
  document.getElementById('holdings-sort').addEventListener('change', renderHoldings);
  document.getElementById('reset-demo-btn').addEventListener('click', handleResetData);
}

function initializeApp() {
  renderAll();
  bindEvents();
  setFormMessage('buy-message', '', '');
  setFormMessage('sell-message', '', '');
}

initializeApp();

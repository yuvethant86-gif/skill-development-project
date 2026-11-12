const STORAGE_KEY = 'portfolio-demo-state-v1';

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getDefaultState() {
  return cloneState(DEMO_PORTFOLIO_STATE);
}

function loadPortfolioState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid portfolio state');
    }

    return sanitizePortfolioState(parsed);
  } catch (error) {
    console.warn('Stored portfolio state was corrupted. Resetting demo data.', error);
    const fallback = getDefaultState();
    savePortfolioState(fallback);
    return fallback;
  }
}

function savePortfolioState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetPortfolioState() {
  const defaultState = getDefaultState();
  savePortfolioState(defaultState);
  return defaultState;
}

function sanitizePortfolioState(state) {
  const safeState = getDefaultState();

  if (Array.isArray(state.holdings)) {
    safeState.holdings = state.holdings
      .filter((holding) => holding && holding.symbol && Number(holding.shares) > 0)
      .map((holding) => ({
        symbol: String(holding.symbol).toUpperCase(),
        company: String(holding.company || getStockBySymbol(String(holding.symbol).toUpperCase())?.company || 'Unknown'),
        shares: Number(holding.shares) || 0,
        avgPrice: Number(holding.avgPrice) || 0
      }));
  }

  if (Array.isArray(state.transactions)) {
    safeState.transactions = state.transactions
      .filter((item) => item && item.symbol)
      .map((item) => ({
        id: String(item.id || `${item.type}-${Date.now()}-${Math.random()}`),
        date: item.date || new Date().toISOString(),
        symbol: String(item.symbol).toUpperCase(),
        company: String(item.company || getStockBySymbol(String(item.symbol).toUpperCase())?.company || 'Unknown'),
        type: item.type === 'SELL' ? 'SELL' : 'BUY',
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        amount: Number(item.amount) || 0
      }));
  }

  safeState.balance = Number(state.balance) || safeState.balance;
  safeState.initialBalance = Number(state.initialBalance) || safeState.initialBalance;
  safeState.totalSpent = Number(state.totalSpent) || safeState.totalSpent;
  safeState.totalReceived = Number(state.totalReceived) || safeState.totalReceived;
  safeState.realizedProfitLoss = Number(state.realizedProfitLoss) || safeState.realizedProfitLoss;

  return safeState;
}

function getStockBySymbol(symbol) {
  return STOCKS.find((stock) => stock.symbol === String(symbol).toUpperCase());
}

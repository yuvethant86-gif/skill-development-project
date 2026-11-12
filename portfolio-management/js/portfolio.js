const DEFAULT_PORTFOLIO_STATE = getDefaultState();

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatSignedCurrency(value) {
  const formatted = formatCurrency(value);
  return value >= 0 ? `+${formatted}` : `${formatted}`;
}

function formatSignedPercent(value) {
  return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
}

function calculateCurrentMarketValue(holdings) {
  return holdings.reduce((total, holding) => {
    const stock = getStockBySymbol(holding.symbol);
    const currentPrice = stock ? stock.price : 0;
    return total + (holding.shares * currentPrice);
  }, 0);
}

function calculateTotalInvestedAmount(holdings) {
  return holdings.reduce((total, holding) => total + (holding.shares * holding.avgPrice), 0);
}

function calculateUnrealizedProfitLoss(holdings) {
  return calculateCurrentMarketValue(holdings) - calculateTotalInvestedAmount(holdings);
}

function calculatePortfolioMetrics(state) {
  const currentMarketValue = calculateCurrentMarketValue(state.holdings);
  const totalInvestedAmount = calculateTotalInvestedAmount(state.holdings);
  const unrealizedProfitLoss = calculateUnrealizedProfitLoss(state.holdings);
  const portfolioValue = state.balance + currentMarketValue;
  const totalProfitLoss = state.realizedProfitLoss + unrealizedProfitLoss;
  const portfolioReturn = totalInvestedAmount > 0 ? (totalProfitLoss / totalInvestedAmount) * 100 : 0;

  return {
    currentMarketValue,
    totalInvestedAmount,
    unrealizedProfitLoss,
    realizedProfitLoss: state.realizedProfitLoss,
    totalProfitLoss,
    portfolioValue,
    portfolioReturn
  };
}

function getStockBySymbol(symbol) {
  return STOCKS.find((stock) => stock.symbol === String(symbol).toUpperCase());
}

function getHoldingBySymbol(state, symbol) {
  return state.holdings.find((holding) => holding.symbol === String(symbol).toUpperCase());
}

function createTransactionEntry(symbol, company, type, quantity, price, amount) {
  return {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    date: new Date().toISOString(),
    symbol: String(symbol).toUpperCase(),
    company,
    type,
    quantity: Number(quantity),
    price: Number(price),
    amount: Number(amount)
  };
}

function buyStock(state, symbol, quantity) {
  const stock = getStockBySymbol(symbol);
  const cleanQty = Number(quantity);

  if (!stock) {
    return { success: false, message: 'Please select a valid stock from the list.' };
  }

  if (!Number.isInteger(cleanQty) || cleanQty <= 0) {
    return { success: false, message: 'Quantity must be a positive whole number.' };
  }

  const totalCost = stock.price * cleanQty;
  if (state.balance < totalCost) {
    return {
      success: false,
      message: `Insufficient available balance. You need ${formatCurrency(totalCost)} but only ${formatCurrency(state.balance)} is available.`
    };
  }

  const existingHolding = getHoldingBySymbol(state, symbol);
  if (existingHolding) {
    const updatedTotalShares = existingHolding.shares + cleanQty;
    const previousInvestment = existingHolding.shares * existingHolding.avgPrice;
    const nextAvgPrice = (previousInvestment + totalCost) / updatedTotalShares;

    existingHolding.shares = updatedTotalShares;
    existingHolding.avgPrice = nextAvgPrice;
  } else {
    state.holdings.push({
      symbol: stock.symbol,
      company: stock.company,
      shares: cleanQty,
      avgPrice: stock.price
    });
  }

  state.balance -= totalCost;
  state.totalSpent += totalCost;
  state.transactions.unshift(createTransactionEntry(stock.symbol, stock.company, 'BUY', cleanQty, stock.price, totalCost));

  return {
    success: true,
    message: `${cleanQty} ${stock.symbol} shares bought successfully.`
  };
}

function sellStock(state, symbol, quantity) {
  const stock = getStockBySymbol(symbol);
  const cleanQty = Number(quantity);

  if (!stock) {
    return { success: false, message: 'Please select a valid stock to sell.' };
  }

  if (!Number.isInteger(cleanQty) || cleanQty <= 0) {
    return { success: false, message: 'Quantity must be a positive whole number.' };
  }

  const holding = getHoldingBySymbol(state, symbol);
  if (!holding) {
    return { success: false, message: 'You do not own this stock in your portfolio.' };
  }

  if (holding.shares < cleanQty) {
    return {
      success: false,
      message: `You only own ${holding.shares} shares of ${stock.symbol}. You cannot sell ${cleanQty}.`
    };
  }

  const saleValue = stock.price * cleanQty;
  const costBasisSold = cleanQty * holding.avgPrice;
  const profitLoss = saleValue - costBasisSold;

  state.balance += saleValue;
  state.totalReceived += saleValue;
  state.realizedProfitLoss += profitLoss;
  holding.shares -= cleanQty;

  if (holding.shares === 0) {
    state.holdings = state.holdings.filter((item) => item.symbol !== stock.symbol);
  }

  state.transactions.unshift(createTransactionEntry(stock.symbol, stock.company, 'SELL', cleanQty, stock.price, saleValue));

  return {
    success: true,
    message: `${cleanQty} ${stock.symbol} shares sold successfully.`
  };
}

function getRecentTransactions(transactions, count = 5) {
  return transactions.slice(0, count);
}

function getAllocationData(holdings) {
  const marketValue = calculateCurrentMarketValue(holdings);

  if (marketValue === 0) {
    return [];
  }

  return holdings.map((holding) => {
    const stock = getStockBySymbol(holding.symbol);
    const currentValue = (holding.shares * (stock ? stock.price : 0));
    const percentage = (currentValue / marketValue) * 100;

    return {
      symbol: holding.symbol,
      company: holding.company,
      value: currentValue,
      percentage
    };
  });
}

function getPriceForSymbol(symbol) {
  const stock = getStockBySymbol(symbol);
  return stock ? stock.price : 0;
}

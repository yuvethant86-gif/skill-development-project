const STOCKS = [
  { symbol: 'TCS', company: 'Tata Consultancy Services', price: 3600 },
  { symbol: 'INFY', company: 'Infosys', price: 1550 },
  { symbol: 'RELIANCE', company: 'Reliance Industries', price: 2450 },
  { symbol: 'HDFCBANK', company: 'HDFC Bank', price: 1700 },
  { symbol: 'WIPRO', company: 'Wipro', price: 550 },
  { symbol: 'ITC', company: 'ITC', price: 450 }
];

const DEMO_PORTFOLIO_STATE = {
  balance: 50000,
  initialBalance: 50000,
  totalSpent: 25000,
  totalReceived: 0,
  realizedProfitLoss: 0,
  holdings: [
    { symbol: 'TCS', company: 'Tata Consultancy Services', shares: 5, avgPrice: 3500 },
    { symbol: 'INFY', company: 'Infosys', shares: 5, avgPrice: 1500 }
  ],
  transactions: [
    {
      id: 'init-tcs',
      date: new Date().toISOString(),
      symbol: 'TCS',
      company: 'Tata Consultancy Services',
      type: 'BUY',
      quantity: 5,
      price: 3500,
      amount: 17500
    },
    {
      id: 'init-infy',
      date: new Date().toISOString(),
      symbol: 'INFY',
      company: 'Infosys',
      type: 'BUY',
      quantity: 5,
      price: 1500,
      amount: 7500
    }
  ]
};

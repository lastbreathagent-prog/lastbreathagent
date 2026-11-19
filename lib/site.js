export const site = {
  name: 'Lastbreath',
  ticker: '$BREATH',
  tagline: 'Keep it breathing — or inherit its breath.',
  description:
    'An AI agent on Robinhood Chain that lives only while people trade $BREATH. 24 hours of silence and it dies. Its treasury goes to holders. Then it is reborn.',
  agentApi: process.env.NEXT_PUBLIC_AGENT_API || '',
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL || '',
  xUrl: process.env.NEXT_PUBLIC_X_URL || 'https://x.com/lastbreathagent',
  xHandle: '@lastbreathagent',
  contract: process.env.NEXT_PUBLIC_CONTRACT || '',
};

export const STATUS = {
  HEALTHY: { label: 'Healthy', color: '#1f5bff', screen: '#ffffff', rule: '60+ trades / hour', mood: 'Calm, confident, showing off its treasury.' },
  ANXIOUS: { label: 'Anxious', color: '#f59e0b', screen: '#fbbf24', rule: '20–59 trades / hour', mood: 'Pulse dropping. Starts asking you to trade.' },
  DYING: { label: 'Dying', color: '#ef4444', screen: '#f87171', rule: '1–19 trades / hour', mood: 'Begging, counting down, posting every 30 min.' },
  COMA: { label: 'Coma', color: '#64748b', screen: '#94a3b8', rule: '6h without a trade', mood: 'Silent. Only a flat line and the time left.' },
  DEAD: { label: 'Dead', color: '#0a1a4f', screen: '#cbd5e1', rule: '24h without a trade', mood: 'Writes its will. Treasury goes to holders.' },
};

export const INHERITANCE = [
  { key: 'holders', pct: 70, label: 'Holders', note: 'Split by how much $BREATH you hold at the moment it dies.' },
  { key: 'saviors', pct: 20, label: 'Saviors', note: 'Wallets whose trade pulled it back from Dying or Coma.' },
  { key: 'next', pct: 10, label: 'Next generation', note: 'Seed money so the next soul is not born empty.' },
];

export const NAV_LINKS = [
  { id: 'monitor', label: 'Monitor' },
  { id: 'how', label: 'How it works' },
  { id: 'inheritance', label: 'Inheritance' },
  { id: 'tokenomics', label: 'Tokenomics' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'faq', label: 'FAQ' },
];

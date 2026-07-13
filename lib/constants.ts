import type { TokenInfo } from './types';

export const STELLAR_NETWORK = {
  name: 'TESTNET',
  passphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  sorobanUrl: 'https://soroban-testnet.stellar.org',
  explorerUrl: 'https://stellar.expert/explorer/testnet',
};

// Replace with your deployed contract address
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN3';

// Well-known testnet tokens — add more as needed
export const TOKENS: TokenInfo[] = [
  {
    code: 'XLM',
    name: 'Stellar Lumens',
    icon: '🌟',
  },
  {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    name: 'USD Coin (testnet)',
    icon: '💵',
  },
  {
    code: 'USDT',
    issuer: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    name: 'Tether USD (testnet)',
    icon: '💲',
  },
  {
    code: 'BTC',
    issuer: 'GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM',
    name: 'Wrapped Bitcoin (testnet)',
    icon: '₿',
  },
  {
    code: 'ETH',
    issuer: 'GBFXOHVAS43OIWNIO7XLRJAHT3BICFEIKOJLZVXNT572MISM4CMGSOCC',
    name: 'Wrapped Ether (testnet)',
    icon: '🔷',
  },
];

export const SLIPPAGE_OPTIONS = [0.5, 1.0, 2.0, 5.0];
export const DEFAULT_SLIPPAGE = 1.0; // 1%

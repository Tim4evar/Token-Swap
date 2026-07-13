// ── Swap-related types ────────────────────────────────────────────────────────

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SwapErrorType {
  code: 'WALLET_NOT_FOUND' | 'USER_REJECTED' | 'INSUFFICIENT_BALANCE' | 'SLIPPAGE' | 'UNKNOWN';
  message: string;
}

export interface TokenInfo {
  code: string;
  issuer?: string; // undefined for XLM (native)
  name: string;
  icon: string;
}

export interface SwapQuote {
  sellAmount: string;
  buyAmount: string;
  price: string;
  priceInverse: string;
  source: 'DEX' | 'estimate';
}

export interface SwapEvent {
  id: string;
  txHash: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
}

export interface ContractSwapParams {
  senderAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
}

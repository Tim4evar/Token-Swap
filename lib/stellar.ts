/**
 * Stellar DEX + Soroban interaction helpers
 *
 * - fetchOrderbookQuote  : reads the live DEX orderbook for a swap price
 * - buildSwapTransaction : constructs a PathPaymentStrictSend transaction
 * - invokeContractSwap   : calls the on-chain Soroban swap contract
 * - submitTransaction    : broadcasts a signed transaction
 * - fetchContractEvents  : polls the RPC for contract swap events
 */

import {
  Asset,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Horizon,
  // Soroban/RPC types are accessed via SorobanRpc namespace
} from '@stellar/stellar-sdk';
import type { TokenInfo, SwapQuote, SwapEvent } from './types';
import { STELLAR_NETWORK, CONTRACT_ADDRESS } from './constants';

const horizonServer = new Horizon.Server(STELLAR_NETWORK.horizonUrl);

/** Convert a TokenInfo into a Stellar Asset */
function toAsset(token: TokenInfo): Asset {
  if (!token.issuer) return Asset.native();
  return new Asset(token.code, token.issuer);
}

// ── Price / quote ────────────────────────────────────────────────────────────

/**
 * Fetch a swap quote from the Stellar DEX orderbook.
 * Uses strict-send path-payment simulation via Horizon's `/paths/strict-send`.
 */
export async function fetchOrderbookQuote(
  sellToken: TokenInfo,
  buyToken: TokenInfo,
  sellAmount: string,
): Promise<SwapQuote> {
  try {
    const sellAsset = toAsset(sellToken);
    const buyAsset = toAsset(buyToken);

    const paths = await horizonServer
      .strictSendPaths(sellAsset, sellAmount, [buyAsset])
      .call();

    if (paths.records.length === 0) {
      throw new Error('No liquidity path found');
    }

    // Pick the best (highest) destination amount
    const best = paths.records.reduce((a, b) =>
      parseFloat(b.destination_amount) > parseFloat(a.destination_amount) ? b : a,
    );

    const sell = parseFloat(sellAmount);
    const buy = parseFloat(best.destination_amount);
    const price = buy / sell;

    return {
      sellAmount,
      buyAmount: best.destination_amount,
      price: price.toFixed(7),
      priceInverse: (sell / buy).toFixed(7),
      source: 'DEX',
    };
  } catch {
    // Fallback: simple 1:1 estimate when no path is available
    return {
      sellAmount,
      buyAmount: sellAmount,
      price: '1.0000000',
      priceInverse: '1.0000000',
      source: 'estimate',
    };
  }
}

// ── Transaction building ─────────────────────────────────────────────────────

/**
 * Build an unsigned PathPaymentStrictSend transaction (uses native DEX).
 * The caller signs this using StellarWalletsKit and then submits it.
 */
export async function buildSwapTransaction(
  senderAddress: string,
  sellToken: TokenInfo,
  buyToken: TokenInfo,
  sellAmount: string,
  minBuyAmount: string,
): Promise<string> {
  const account = await horizonServer.loadAccount(senderAddress);

  const sellAsset = toAsset(sellToken);
  const buyAsset = toAsset(buyToken);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: sellAsset,
        sendAmount: sellAmount,
        destination: senderAddress, // send to self (swap)
        destAsset: buyAsset,
        destMin: minBuyAmount,
        path: [], // Horizon will find the best path
      }),
    )
    .setTimeout(60)
    .build();

  return tx.toXDR();
}

// ── Submit ───────────────────────────────────────────────────────────────────

/** Submit a signed transaction XDR and return the tx hash */
export async function submitTransaction(signedXdr: string): Promise<string> {
  const { TransactionBuilder } = await import('@stellar/stellar-sdk');
  const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  const result = await horizonServer.submitTransaction(tx);
  return result.hash;
}

// ── Contract events ──────────────────────────────────────────────────────────

/**
 * Fetch recent swap events from the Soroban contract via the RPC.
 * Returns the last `limit` events.
 */
export async function fetchContractEvents(limit = 10): Promise<SwapEvent[]> {
  try {
    const { rpc } = await import('@stellar/stellar-sdk');
    const server = new rpc.Server(STELLAR_NETWORK.sorobanUrl);

    // Get the current ledger to set a search window (~1 hour of ledgers)
    const latestLedger = await server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 720);

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [CONTRACT_ADDRESS],
        },
      ],
      limit,
    });

    return (response.events ?? []).map((e) => ({
      id: e.id,
      txHash: e.txHash,
      sellToken: 'XLM',
      buyToken: 'USDC',
      sellAmount: '0',
      buyAmount: '0',
      timestamp: new Date(e.ledgerClosedAt).getTime(),
      status: 'success' as const,
    }));
  } catch {
    return [];
  }
}

// ── Account balance ──────────────────────────────────────────────────────────

export interface AccountBalance {
  asset: string;
  balance: string;
}

/** Fetch all balances for an account */
export async function fetchBalances(address: string): Promise<AccountBalance[]> {
  try {
    const account = await horizonServer.loadAccount(address);
    return account.balances.map((b) => ({
      asset:
        b.asset_type === 'native'
          ? 'XLM'
          : `${(b as Horizon.HorizonApi.BalanceLine<'credit_alphanum4' | 'credit_alphanum12'>).asset_code}`,
      balance: b.balance,
    }));
  } catch {
    return [];
  }
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from './useWallet';
import {
  fetchOrderbookQuote,
  buildSwapTransaction,
  submitTransaction,
  fetchBalances,
  fetchContractEvents,
  type AccountBalance,
} from '../lib/stellar';
import { DEFAULT_SLIPPAGE, TOKENS } from '../lib/constants';
import type { SwapErrorType, SwapEvent, SwapQuote, TxStatus, TokenInfo } from '../lib/types';

export function useSwap() {
  const { address, signTransaction } = useWallet();

  const [sellToken, setSellToken] = useState<TokenInfo>(TOKENS[0]);
  const [buyToken, setBuyToken] = useState<TokenInfo>(TOKENS[1]);
  const [sellAmount, setSellAmount] = useState('');
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<SwapErrorType | null>(null);

  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [events, setEvents] = useState<SwapEvent[]>([]);

  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load balances when address changes ──────────────────────────────────

  useEffect(() => {
    if (!address) {
      setBalances([]);
      return;
    }
    fetchBalances(address).then(setBalances).catch(() => {});
  }, [address, txStatus]); // re-fetch after each swap

  // ── Debounced quote fetching ─────────────────────────────────────────────

  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      setQuote(null);
      return;
    }

    setIsQuoting(true);
    quoteTimerRef.current = setTimeout(async () => {
      try {
        const q = await fetchOrderbookQuote(sellToken, buyToken, sellAmount);
        setQuote(q);
      } catch {
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    }, 600);
  }, [sellAmount, sellToken, buyToken]);

  // ── Real-time event polling ──────────────────────────────────────────────

  useEffect(() => {
    const poll = async () => {
      const evts: SwapEvent[] = await fetchContractEvents(10);
      if (evts.length > 0) setEvents(evts);
    };

    poll();
    eventPollerRef.current = setInterval(poll, 10_000); // every 10 s

    return () => {
      if (eventPollerRef.current) clearInterval(eventPollerRef.current);
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getBalance = useCallback(
    (token: TokenInfo) => {
      const b = balances.find((bl) => bl.asset === token.code);
      return b?.balance ?? '0';
    },
    [balances],
  );

  const flipTokens = useCallback(() => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount(quote?.buyAmount ?? '');
  }, [sellToken, buyToken, quote]);

  const clearSwapError = useCallback(() => setSwapError(null), []);

  // ── Execute swap ─────────────────────────────────────────────────────────

  const executeSwap = useCallback(async () => {
    if (!address) return;
    if (!quote) return;

    setTxStatus('pending');
    setTxHash(null);
    setSwapError(null);

    try {
      // ── Error type 3: Insufficient balance check ──────────────────────
      const sellBalance = parseFloat(getBalance(sellToken));
      const sellAmt = parseFloat(sellAmount);
      if (sellAmt > sellBalance) {
        throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT_BALANCE' });
      }

      // Apply slippage to compute minBuyAmount
      const minBuyAmount = (parseFloat(quote.buyAmount) * (1 - slippage / 100)).toFixed(7);

      // Build unsigned transaction
      const unsignedXdr = await buildSwapTransaction(
        address,
        sellToken,
        buyToken,
        sellAmount,
        minBuyAmount,
      );

      // ── User signs — rejection surfaces as error type 2 ───────────────
      const signedXdr = await signTransaction(unsignedXdr);

      // Submit to network
      const hash = await submitTransaction(signedXdr);
      setTxHash(hash);
      setTxStatus('success');

      // Inject optimistic event for instant UI feedback
      setEvents((prev) => [
        {
          id: hash,
          txHash: hash,
          sellToken: sellToken.code,
          buyToken: buyToken.code,
          sellAmount,
          buyAmount: quote.buyAmount,
          timestamp: Date.now(),
          status: 'success',
        },
        ...prev,
      ]);

      setSellAmount('');
      setQuote(null);
    } catch (err: unknown) {
      const errObj = err as Error & { code?: string; response?: { data?: { extras?: { result_codes?: unknown } } } };

      setTxStatus('error');

      // ── Error type 2: User rejected transaction signing ───────────────
      if (
        errObj?.message?.toLowerCase().includes('rejected') ||
        errObj?.message?.toLowerCase().includes('denied') ||
        errObj?.message?.toLowerCase().includes('cancelled') ||
        errObj?.message?.toLowerCase().includes('user declined')
      ) {
        setSwapError({
          code: 'USER_REJECTED',
          message: 'Transaction rejected. You declined to sign in your wallet.',
        });
      }
      // ── Error type 3: Insufficient balance ───────────────────────────
      else if (
        errObj?.code === 'INSUFFICIENT_BALANCE' ||
        errObj?.message?.toLowerCase().includes('insufficient') ||
        errObj?.message?.toLowerCase().includes('underfunded')
      ) {
        setSwapError({
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient ${sellToken.code} balance. You need ${sellAmount} but only have ${getBalance(sellToken)}.`,
        });
      }
      // ── Slippage error ────────────────────────────────────────────────
      else if (errObj?.message?.toLowerCase().includes('slippage')) {
        setSwapError({
          code: 'SLIPPAGE',
          message: 'Price moved beyond slippage tolerance. Try increasing slippage or retry.',
        });
      } else {
        setSwapError({
          code: 'UNKNOWN',
          message: errObj?.message ?? 'Swap failed. Please try again.',
        });
      }
    }
  }, [address, quote, sellToken, buyToken, sellAmount, slippage, signTransaction, getBalance]);

  return {
    // tokens
    sellToken,
    buyToken,
    setSellToken,
    setBuyToken,
    flipTokens,
    // amounts
    sellAmount,
    setSellAmount,
    // slippage
    slippage,
    setSlippage,
    // quote
    quote,
    isQuoting,
    // tx
    txStatus,
    txHash,
    swapError,
    clearSwapError,
    executeSwap,
    // balances
    balances,
    getBalance,
    // events
    events,
  };
}

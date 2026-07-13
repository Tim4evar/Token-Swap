'use client';

import React from 'react';
import { useSwap } from '../hooks/useSwap';
import { useWallet } from '../hooks/useWallet';
import { TokenSelector } from './TokenSelector';
import { TransactionStatus } from './TransactionStatus';
import { SLIPPAGE_OPTIONS, STELLAR_NETWORK } from '../lib/constants';

export function SwapCard() {
  const { address } = useWallet();
  const {
    sellToken,
    buyToken,
    setSellToken,
    setBuyToken,
    flipTokens,
    sellAmount,
    setSellAmount,
    slippage,
    setSlippage,
    quote,
    isQuoting,
    txStatus,
    txHash,
    swapError,
    clearSwapError,
    executeSwap,
    getBalance,
  } = useSwap();

  const canSwap =
    address &&
    sellAmount &&
    parseFloat(sellAmount) > 0 &&
    quote &&
    txStatus !== 'pending';

  const handleDismiss = () => {
    clearSwapError();
    // Status resets to idle on next executeSwap call — no explicit reset needed
  };

  return (
    <div className="w-full max-w-[480px] rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl shadow-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-lg font-bold text-white">Swap</h1>
        {/* Slippage settings */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Slippage:</span>
          {SLIPPAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSlippage(opt)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                slippage === opt
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {opt}%
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-2">
        {/* ── Sell panel ────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <label htmlFor="sellAmount" className="text-xs text-gray-400 mb-1 block">
                You pay
              </label>
              <input
                id="sellAmount"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-semibold text-white placeholder-gray-600 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Amount of ${sellToken.code} to sell`}
              />
              {address && (
                <button
                  onClick={() => setSellAmount(getBalance(sellToken))}
                  className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Max: {parseFloat(getBalance(sellToken)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {sellToken.code}
                </button>
              )}
            </div>
            <TokenSelector
              label="From"
              value={sellToken}
              onChange={setSellToken}
              excludeToken={buyToken}
              balance={address ? getBalance(sellToken) : undefined}
            />
          </div>
        </div>

        {/* ── Flip button ───────────────────────────────────────────── */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={flipTokens}
            className="rounded-xl bg-gray-800 border border-gray-700 p-2 hover:bg-gray-700 transition-colors"
            aria-label="Flip sell and buy tokens"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">You receive</label>
              <div
                className="text-2xl font-semibold"
                aria-live="polite"
                aria-label={`Estimated amount of ${buyToken.code} to receive`}
              >
                {isQuoting ? (
                  <span className="text-gray-600 animate-pulse">…</span>
                ) : quote ? (
                  <span className="text-white">
                    {parseFloat(quote.buyAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 7,
                    })}
                  </span>
                ) : (
                  <span className="text-gray-600">0.00</span>
                )}
              </div>
              {quote && (
                <p className="mt-1 text-xs text-gray-500">
                  1 {sellToken.code} ≈ {parseFloat(quote.price).toFixed(6)} {buyToken.code}
                  {quote.source === 'estimate' && (
                    <span className="ml-1 text-yellow-600">(estimate)</span>
                  )}
                </p>
              )}
            </div>
            <TokenSelector
              label="To"
              value={buyToken}
              onChange={setBuyToken}
              excludeToken={sellToken}
              balance={address ? getBalance(buyToken) : undefined}
            />
          </div>
        </div>

        {/* ── Quote details ─────────────────────────────────────────── */}
        {quote && (
          <div className="rounded-xl bg-gray-800/40 px-4 py-3 text-xs text-gray-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Rate</span>
              <span className="text-gray-200">
                1 {sellToken.code} = {parseFloat(quote.price).toFixed(6)} {buyToken.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Minimum received</span>
              <span className="text-gray-200">
                {(parseFloat(quote.buyAmount) * (1 - slippage / 100)).toFixed(6)} {buyToken.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Slippage tolerance</span>
              <span className="text-gray-200">{slippage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Source</span>
              <span className={quote.source === 'DEX' ? 'text-green-400' : 'text-yellow-400'}>
                {quote.source === 'DEX' ? '🌊 Stellar DEX' : '📊 Estimate'}
              </span>
            </div>
          </div>
        )}

        {/* ── Transaction status ─────────────────────────────────────── */}
        {txStatus !== 'idle' && (
          <TransactionStatus
            status={txStatus}
            txHash={txHash}
            error={swapError}
            onDismiss={handleDismiss}
          />
        )}

        {/* ── Swap button ────────────────────────────────────────────── */}
        {!address ? (
          <p className="text-center text-sm text-gray-500 py-2">
            Connect your wallet to swap
          </p>
        ) : (
          <button
            onClick={executeSwap}
            disabled={!canSwap}
            className="w-full rounded-2xl py-4 text-base font-bold transition-all
              bg-indigo-600 hover:bg-indigo-500 text-white
              disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
              shadow-lg shadow-indigo-900/30"
            aria-disabled={!canSwap}
          >
            {txStatus === 'pending'
              ? 'Swapping…'
              : !sellAmount || parseFloat(sellAmount) <= 0
                ? 'Enter an amount'
                : isQuoting
                  ? 'Fetching price…'
                  : !quote
                    ? 'No liquidity path'
                    : `Swap ${sellToken.code} → ${buyToken.code}`}
          </button>
        )}

        {/* ── Testnet badge ─────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/30 border border-yellow-700/40 px-3 py-1 text-xs text-yellow-400">
            ⚠️ Testnet
          </span>
          <a
            href={STELLAR_NETWORK.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Stellar Explorer ↗
          </a>
        </div>
      </div>
    </div>
  );
}

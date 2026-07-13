'use client';

import React from 'react';
import type { TxStatus, SwapErrorType } from '../lib/types';
import { STELLAR_NETWORK } from '../lib/constants';

interface Props {
  status: TxStatus;
  txHash: string | null;
  error: SwapErrorType | null;
  onDismiss: () => void;
}

export function TransactionStatus({ status, txHash, error, onDismiss }: Props) {
  if (status === 'idle') return null;

  const explorerUrl = txHash
    ? `${STELLAR_NETWORK.explorerUrl}/tx/${txHash}`
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-4 transition-all ${
        status === 'pending'
          ? 'border-yellow-500/40 bg-yellow-900/20'
          : status === 'success'
            ? 'border-green-500/40 bg-green-900/20'
            : 'border-red-500/40 bg-red-900/20'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 text-2xl mt-0.5">
          {status === 'pending' && (
            <svg className="w-6 h-6 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {status === 'success' && <span>✅</span>}
          {status === 'error' && <span>❌</span>}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold ${
              status === 'pending'
                ? 'text-yellow-300'
                : status === 'success'
                  ? 'text-green-300'
                  : 'text-red-300'
            }`}
          >
            {status === 'pending' && 'Transaction Pending…'}
            {status === 'success' && 'Swap Successful!'}
            {status === 'error' && getErrorTitle(error)}
          </p>

          {status === 'error' && error && (
            <div className="mt-1">
              <span className="inline-block rounded bg-red-900/50 px-2 py-0.5 text-xs font-mono text-red-400 mr-2">
                {error.code}
              </span>
              <p className="text-red-400/80 text-sm mt-1">{error.message}</p>
            </div>
          )}

          {status === 'pending' && (
            <p className="text-yellow-400/70 text-sm mt-1">
              Please sign the transaction in your wallet…
            </p>
          )}

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View on Stellar Explorer
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {txHash && (
            <p className="mt-1 text-xs text-gray-500 font-mono truncate">
              {txHash}
            </p>
          )}
        </div>

        {/* Dismiss */}
        {(status === 'success' || status === 'error') && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function getErrorTitle(error: SwapErrorType | null): string {
  if (!error) return 'Transaction Failed';
  switch (error.code) {
    case 'WALLET_NOT_FOUND':
      return 'Wallet Not Found';
    case 'USER_REJECTED':
      return 'Transaction Rejected';
    case 'INSUFFICIENT_BALANCE':
      return 'Insufficient Balance';
    case 'SLIPPAGE':
      return 'Slippage Exceeded';
    default:
      return 'Transaction Failed';
  }
}

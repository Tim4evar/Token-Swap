'use client';

import React from 'react';
import { useWallet } from '../hooks/useWallet';

function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnecting, connect, disconnect, error, clearError } = useWallet();

  return (
    <div className="flex flex-col items-end gap-2">
      {address ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-green-900/40 border border-green-500/40 px-4 py-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-sm font-mono">{shortAddress(address)}</span>
          </div>
          <button
            onClick={disconnect}
            className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-900/40"
        >
          {isConnecting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Connecting…
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 max-w-sm text-sm">
          <span className="text-red-400 font-semibold shrink-0">
            {error.code === 'WALLET_NOT_FOUND' && '🔍'}
            {error.code === 'USER_REJECTED' && '🚫'}
            {error.code === 'INSUFFICIENT_BALANCE' && '💸'}
            {error.code === 'UNKNOWN' && '⚠️'}
          </span>
          <div className="flex-1">
            <p className="text-red-300 font-medium">
              {error.code === 'WALLET_NOT_FOUND' && 'Wallet Not Found'}
              {error.code === 'USER_REJECTED' && 'Connection Rejected'}
              {error.code === 'UNKNOWN' && 'Connection Error'}
            </p>
            <p className="text-red-400/80 mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-300 ml-1 shrink-0"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

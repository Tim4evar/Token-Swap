'use client';

import React, { useEffect, useState } from 'react';
import { CONTRACT_ADDRESS, STELLAR_NETWORK } from '../lib/constants';

interface AccountData {
  balance: string;
  ledger: number;
}

export function ContractInfo() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch the latest ledger number from the RPC
        const res = await fetch(STELLAR_NETWORK.sorobanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestLedger',
            params: {},
          }),
        });
        const json = await res.json() as { result?: { sequence?: number } };
        setData({
          balance: '—',
          ledger: json.result?.sequence ?? 0,
        });
      } catch {
        setData({ balance: '—', ledger: 0 });
      } finally {
        setLoading(false);
      }
    }

    load();
    // Refresh every 15 seconds
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      aria-label="Contract information"
      className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <span aria-hidden="true">📜</span> Contract Info
      </h2>

      {/* Contract address */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Contract Address</p>
        <a
          href={`${STELLAR_NETWORK.explorerUrl}/contract/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 break-all transition-colors"
        >
          {CONTRACT_ADDRESS}
        </a>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-800/60 px-3 py-2">
          <p className="text-xs text-gray-500">Network</p>
          <p className="text-sm font-semibold text-yellow-400">Testnet</p>
        </div>
        <div className="rounded-xl bg-gray-800/60 px-3 py-2">
          <p className="text-xs text-gray-500">Latest Ledger</p>
          <p className="text-sm font-semibold text-white">
            {loading ? (
              <span className="animate-pulse text-gray-600">…</span>
            ) : (
              data?.ledger.toLocaleString()
            )}
          </p>
        </div>
        <div className="rounded-xl bg-gray-800/60 px-3 py-2 col-span-2">
          <p className="text-xs text-gray-500">Type</p>
          <p className="text-sm font-semibold text-white">
            Soroban Token Swap
          </p>
        </div>
      </div>

      {/* Explorer links */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`${STELLAR_NETWORK.explorerUrl}/contract/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-900/30 border border-indigo-700/40 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-900/50 transition-colors"
        >
          View Contract ↗
        </a>
        <a
          href={`${STELLAR_NETWORK.explorerUrl}/ledger`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"
        >
          Explorer ↗
        </a>
      </div>
    </section>
  );
}

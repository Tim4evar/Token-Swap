'use client';

import React from 'react';
import type { SwapEvent } from '../lib/types';
import { STELLAR_NETWORK } from '../lib/constants';

interface Props {
  events: SwapEvent[];
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortHash(hash: string) {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function EventFeed({ events }: Props) {
  return (
    <section aria-label="Recent swap events" className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-200">Live Swap Events</h2>
        <span className="ml-auto text-xs text-gray-500">{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-500 text-sm">
          No events yet — make a swap to see it here.
        </div>
      ) : (
        <ul className="divide-y divide-gray-800/60">
          {events.slice(0, 8).map((evt) => (
            <li key={evt.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors">
              {/* Status indicator */}
              <span
                className={`shrink-0 text-lg ${
                  evt.status === 'success' ? 'text-green-400' : evt.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                }`}
                aria-label={evt.status}
              >
                {evt.status === 'success' ? '✅' : evt.status === 'pending' ? '⏳' : '❌'}
              </span>

              {/* Swap direction */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-200">
                  <span>{parseFloat(evt.sellAmount).toFixed(4)}</span>
                  <span className="text-gray-400">{evt.sellToken}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span>{parseFloat(evt.buyAmount).toFixed(4)}</span>
                  <span className="text-gray-400">{evt.buyToken}</span>
                </div>
                {evt.txHash && (
                  <a
                    href={`${STELLAR_NETWORK.explorerUrl}/tx/${evt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                  >
                    {shortHash(evt.txHash)}
                  </a>
                )}
              </div>

              {/* Time */}
              <span className="shrink-0 text-xs text-gray-500 tabular-nums">
                {timeAgo(evt.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

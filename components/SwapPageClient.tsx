'use client';

import React from 'react';
import { WalletButton } from './WalletButton';
import { SwapCard } from './SwapCard';
import { EventFeed } from './EventFeed';
import { ContractInfo } from './ContractInfo';
import { useSwap } from '../hooks/useSwap';

function PageContent() {
  const { events } = useSwap();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      {/* Navigation */}
      <nav className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🌟</span>
            <div>
              <span className="font-bold text-white text-lg leading-none block">StellarSwap</span>
              <span className="text-xs text-yellow-500 leading-none">Testnet</span>
            </div>
          </div>
          <WalletButton />
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Swap card — center column */}
          <div className="flex-none w-full lg:w-auto">
            <SwapCard />
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 max-w-sm w-full space-y-5">
            <ContractInfo />
            <EventFeed events={events} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-600 space-y-1">
          <p>Built on Stellar Testnet · Powered by Soroban smart contracts</p>
          <p>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              stellar.org
            </a>
            {' · '}
            <a
              href="https://developers.stellar.org/docs/build/smart-contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Soroban docs
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function SwapPageClient() {
  return <PageContent />;
}

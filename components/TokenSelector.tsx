'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { TokenInfo } from '../lib/types';
import { TOKENS } from '../lib/constants';

interface Props {
  value: TokenInfo;
  onChange: (token: TokenInfo) => void;
  excludeToken?: TokenInfo;
  balance?: string;
  label: string;
}

export function TokenSelector({ value, onChange, excludeToken, balance, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const available = TOKENS.filter((t) => t.code !== excludeToken?.code);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-2 transition-colors min-w-[120px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-xl" aria-hidden="true">{value.icon}</span>
        <div className="text-left flex-1">
          <div className="text-sm font-semibold text-white">{value.code}</div>
          {balance !== undefined && (
            <div className="text-xs text-gray-400">
              Bal: {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-56 rounded-xl bg-gray-800 border border-gray-700 shadow-xl overflow-hidden"
        >
          {available.map((token) => (
            <li key={token.code}>
              <button
                type="button"
                role="option"
                aria-selected={token.code === value.code}
                onClick={() => {
                  onChange(token);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                  token.code === value.code ? 'bg-indigo-900/40' : ''
                }`}
              >
                <span className="text-xl" aria-hidden="true">{token.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{token.code}</div>
                  <div className="text-xs text-gray-400">{token.name}</div>
                </div>
                {token.code === value.code && (
                  <span className="ml-auto text-indigo-400">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

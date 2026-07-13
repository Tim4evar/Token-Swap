'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { SwapErrorType } from '../lib/types';
import { STELLAR_NETWORK } from '../lib/constants';

interface WalletContextValue {
  address: string | null;
  isConnecting: boolean;
  error: SwapErrorType | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async () => '',
  clearError: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<SwapErrorType | null>(null);
  // kit is lazily initialised client-side only to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kitRef = useRef<any>(null);

  // Restore previously connected wallet from localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('stellar_address') : null;
    if (saved) setAddress(saved);
  }, []);

  /** Lazily create the StellarWalletsKit on first use */
  const getKit = useCallback(async () => {
    if (kitRef.current) return kitRef.current;

    const {
      StellarWalletsKit,
      WalletNetwork,
      FREIGHTER_ID,
      FreighterModule,
      xBullModule,
      HanaModule,
      LobstrModule,
    } = await import('@creit.tech/stellar-wallets-kit');

    const kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new HanaModule(),
        new LobstrModule(),
      ],
    });

    kitRef.current = kit;
    return kit;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const kit = await getKit();

      await new Promise<void>((resolve, reject) => {
        kit.openModal({
          onWalletSelected: async (option: { id: string; name: string }) => {
            try {
              kit.setWallet(option.id);
              const { address: addr } = await kit.getAddress();
              setAddress(addr);
              localStorage.setItem('stellar_address', addr);
              resolve();
            } catch (err: unknown) {
              reject(err);
            }
          },
          onClosed: (err: Error) => {
            // User closed the modal without selecting
            if (err) reject(err);
            else reject(new Error('USER_CLOSED'));
          },
          modalTitle: 'Connect Wallet',
          notAvailableText: 'Not installed',
        });
      });
    } catch (err: unknown) {
      const errObj = err as Error & { code?: string };
      // ── Error type 1: Wallet not found / not installed ──────────────────
      if (
        errObj?.message?.toLowerCase().includes('not found') ||
        errObj?.message?.toLowerCase().includes('not installed') ||
        errObj?.message?.toLowerCase().includes('undefined')
      ) {
        setError({
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet extension not found. Please install Freighter or another Stellar wallet.',
        });
      }
      // ── Error type 2: User rejected / closed modal ───────────────────────
      else if (
        errObj?.message === 'USER_CLOSED' ||
        errObj?.message?.toLowerCase().includes('rejected') ||
        errObj?.message?.toLowerCase().includes('denied') ||
        errObj?.message?.toLowerCase().includes('cancelled')
      ) {
        setError({
          code: 'USER_REJECTED',
          message: 'Connection rejected. You closed the wallet dialog.',
        });
      } else {
        setError({
          code: 'UNKNOWN',
          message: errObj?.message ?? 'An unknown error occurred.',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [getKit]);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem('stellar_address');
    if (kitRef.current) {
      kitRef.current.disconnect?.().catch(() => {});
    }
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!address) throw new Error('No wallet connected');
      const kit = await getKit();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: STELLAR_NETWORK.passphrase,
        address,
      });
      return signedTxXdr;
    },
    [address, getKit],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <WalletContext.Provider
      value={{ address, isConnecting, error, connect, disconnect, signTransaction, clearError }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

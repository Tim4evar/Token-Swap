#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║         StellarSwap — Soroban Contract Deploy Script                    ║
# ║                                                                          ║
# ║  Prerequisites:                                                          ║
# ║    1. Rust + wasm32 target:                                              ║
# ║         curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  ║
# ║         rustup target add wasm32-unknown-unknown                         ║
# ║    2. Stellar CLI v27+:                                                  ║
# ║         # Pre-built binary (fastest):                                    ║
# ║         curl -sSL https://github.com/stellar/stellar-cli/releases/       ║
# ║           download/v27.0.0/stellar-cli-27.0.0-x86_64-unknown-linux-gnu  ║
# ║           .tar.gz | tar xz && sudo mv stellar /usr/local/bin/            ║
# ║         # or via cargo:                                                  ║
# ║         cargo install --locked stellar-cli                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ── Locate project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

echo "═══════════════════════════════════════════"
echo "   StellarSwap Contract Deploy"
echo "   Network: $NETWORK"
echo "═══════════════════════════════════════════"

# ── 1. Configure Stellar CLI network ────────────────────────────────────────
echo ""
echo "▶ Configuring network…"
stellar network add \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  "$NETWORK" 2>/dev/null || true

# ── 2. Generate (or use existing) identity ──────────────────────────────────
IDENTITY="token-swap-deployer"
echo ""
echo "▶ Checking identity '$IDENTITY'…"
if ! stellar keys address "$IDENTITY" &>/dev/null; then
  echo "  Generating new identity…"
  stellar keys generate --network "$NETWORK" "$IDENTITY"
fi

DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
echo "  Deployer: $DEPLOYER_ADDRESS"

# ── 3. Fund via friendbot ────────────────────────────────────────────────────
echo ""
echo "▶ Funding deployer via friendbot…"
FUND_RESULT=$(curl -s "https://friendbot.stellar.org/?addr=${DEPLOYER_ADDRESS}")
TX_HASH=$(echo "$FUND_RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('hash','already_funded'))" 2>/dev/null || echo "already_funded")
echo "  Fund tx: $TX_HASH"

# ── 4. Build the contract using stellar contract build ───────────────────────
echo ""
echo "▶ Building contract (stellar contract build)…"
stellar contract build \
  --manifest-path contracts/token_swap/Cargo.toml \
  --package token-swap

WASM_PATH="contracts/token_swap/target/wasm32-unknown-unknown/release/token_swap.wasm"
if [ ! -f "$WASM_PATH" ]; then
  # fallback: cargo may write to workspace target
  WASM_PATH="target/wasm32-unknown-unknown/release/token_swap.wasm"
fi

if [ ! -f "$WASM_PATH" ]; then
  echo "ERROR: WASM not found. Searched:"
  echo "  contracts/token_swap/target/wasm32-unknown-unknown/release/token_swap.wasm"
  echo "  target/wasm32-unknown-unknown/release/token_swap.wasm"
  exit 1
fi
echo "  WASM: $WASM_PATH ($(du -sh "$WASM_PATH" | cut -f1))"

# ── 5. Deploy contract (upload + instantiate in one step) ────────────────────
echo ""
echo "▶ Deploying contract to $NETWORK…"
CONTRACT_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --wasm "$WASM_PATH")
echo "  Contract ID: $CONTRACT_ID"

# ── 6. Initialize the contract ───────────────────────────────────────────────
echo ""
echo "▶ Initializing contract (admin = deployer)…"
INIT_TX=$(stellar contract invoke \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --id "$CONTRACT_ID" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS")
echo "  ✅ Initialized (tx: $INIT_TX)"

# ── 7. Verify — read total swaps ─────────────────────────────────────────────
echo ""
echo "▶ Verifying contract…"
TOTAL=$(stellar contract invoke \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --id "$CONTRACT_ID" \
  -- get_total_swaps)
echo "  Total swaps: $TOTAL"

# ── 8. Update .env.local ────────────────────────────────────────────────────
echo ""
echo "▶ Saving contract address to .env.local…"
if [ -f .env.local ]; then
  # Remove existing entry
  grep -v "NEXT_PUBLIC_CONTRACT_ADDRESS" .env.local > .env.local.tmp || true
  mv .env.local.tmp .env.local
fi
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ID" >> .env.local
echo "  Saved to .env.local"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "   🚀 Deploy Complete!"
echo "═══════════════════════════════════════════"
echo "   Contract ID : $CONTRACT_ID"
echo "   Deployer    : $DEPLOYER_ADDRESS"
echo "   Network     : $NETWORK"
echo "   Explorer    : https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "   .env.local updated. Now run:"
echo "   npm run dev"
echo "═══════════════════════════════════════════"

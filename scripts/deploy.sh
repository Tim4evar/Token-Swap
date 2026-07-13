#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║         StellarSwap — Soroban Contract Deploy Script                    ║
# ║                                                                          ║
# ║  Prerequisites:                                                          ║
# ║    1. Rust + wasm32 target:                                              ║
# ║         curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  ║
# ║         rustup target add wasm32-unknown-unknown                         ║
# ║    2. Stellar CLI:                                                       ║
# ║         cargo install --locked stellar-cli --features opt                ║
# ║    3. A funded testnet keypair — fund with friendbot:                    ║
# ║         https://friendbot.stellar.org/?addr=<YOUR_PUBLIC_KEY>           ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

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
if ! stellar keys show "$IDENTITY" &>/dev/null; then
  echo "  Generating new identity…"
  stellar keys generate --network "$NETWORK" "$IDENTITY"
fi

DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
echo "  Deployer: $DEPLOYER_ADDRESS"

# ── 3. Fund via friendbot ────────────────────────────────────────────────────
echo ""
echo "▶ Funding deployer via friendbot…"
curl -s "https://friendbot.stellar.org/?addr=${DEPLOYER_ADDRESS}" | python3 -c "import sys,json; r=json.load(sys.stdin); print('  Funded:', r.get('hash','already funded'))" 2>/dev/null || echo "  (Already funded or friendbot unavailable)"

# ── 4. Build the contract ────────────────────────────────────────────────────
echo ""
echo "▶ Building contract…"
cd "$(dirname "$0")"
cargo build --manifest-path contracts/token_swap/Cargo.toml \
  --target wasm32-unknown-unknown \
  --release

WASM_PATH="contracts/token_swap/target/wasm32-unknown-unknown/release/token_swap.wasm"
if [ ! -f "$WASM_PATH" ]; then
  WASM_PATH="target/wasm32-unknown-unknown/release/token_swap.wasm"
fi

echo "  WASM: $WASM_PATH"

# ── 5. Optimize with wasm-opt (optional) ────────────────────────────────────
if command -v stellar &>/dev/null; then
  echo ""
  echo "▶ Optimizing WASM…"
  stellar contract optimize --wasm "$WASM_PATH" 2>/dev/null || echo "  (Skipping optimization)"
fi

# ── 6. Upload WASM ───────────────────────────────────────────────────────────
echo ""
echo "▶ Uploading WASM to $NETWORK…"
WASM_HASH=$(stellar contract upload \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --wasm "$WASM_PATH")
echo "  WASM hash: $WASM_HASH"

# ── 7. Deploy contract instance ──────────────────────────────────────────────
echo ""
echo "▶ Deploying contract instance…"
CONTRACT_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --wasm-hash "$WASM_HASH")
echo "  Contract ID: $CONTRACT_ID"

# ── 8. Initialize the contract ───────────────────────────────────────────────
echo ""
echo "▶ Initializing contract (admin = deployer)…"
stellar contract invoke \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --id "$CONTRACT_ID" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS"
echo "  ✅ Initialized"

# ── 9. Verify — read total swaps ─────────────────────────────────────────────
echo ""
echo "▶ Verifying contract…"
TOTAL=$(stellar contract invoke \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  --id "$CONTRACT_ID" \
  -- get_total_swaps)
echo "  Total swaps: $TOTAL"

# ── 10. Update .env.local ────────────────────────────────────────────────────
echo ""
echo "▶ Saving contract address to .env.local…"
if [ -f .env.local ]; then
  sed -i.bak "/NEXT_PUBLIC_CONTRACT_ADDRESS/d" .env.local
fi
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ID" >> .env.local
echo "  Saved."

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
echo "   Add to your .env.local:"
echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ID"
echo "═══════════════════════════════════════════"

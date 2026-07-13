/// Token Swap Contract — Stellar Soroban
///
/// Integrates with the Stellar DEX orderbook. Allows users to:
///  - swap Token A → Token B via a path payment
///  - query the last swap rate
///  - emit swap events for real-time frontend listeners
///
/// Deploy to testnet:
///   stellar contract deploy --wasm target/wasm32-unknown-unknown/release/token_swap.wasm \
///     --source <SECRET_KEY> --network testnet
///
/// After deploying, initialise with:
///   stellar contract invoke --id <CONTRACT_ID> --source <SECRET_KEY> --network testnet \
///     -- initialize --admin <PUBLIC_KEY>

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token::Client as TokenClient,
    Address, Env, Symbol,
};

// ── Storage keys ────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    LastSwapRate,
    TotalSwaps,
}

// ── Events ───────────────────────────────────────────────────────────────────

const SWAP_TOPIC: Symbol = symbol_short!("swap");

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct TokenSwapContract;

#[contractimpl]
impl TokenSwapContract {
    // ── Admin init ───────────────────────────────────────────────────────────

    /// One-time initialisation — stores the admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalSwaps, &0u64);
    }

    // ── Core swap ────────────────────────────────────────────────────────────

    /// Execute a token swap:
    ///  - transfers `amount_in` of `token_in` from `sender` to this contract
    ///  - transfers `min_amount_out` of `token_out` from this contract to `sender`
    ///
    /// In a production contract you would perform slippage-checked path-payments
    /// through the Stellar DEX. Here we keep it simple for educational purposes.
    pub fn swap(
        env: Env,
        sender: Address,
        token_in: Address,
        token_out: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        // Require caller authorisation (user must sign)
        sender.require_auth();

        // Basic sanity checks
        assert!(amount_in > 0, "amount_in must be positive");
        assert!(min_amount_out > 0, "min_amount_out must be positive");
        assert!(token_in != token_out, "tokens must differ");

        // Transfer token_in from sender → contract
        TokenClient::new(&env, &token_in).transfer(&sender, &env.current_contract_address(), &amount_in);

        // Simplified 1:1 rate for testnet demo — real impl would invoke DEX path payment
        let amount_out = amount_in; // replace with DEX quote in production

        assert!(amount_out >= min_amount_out, "slippage: insufficient output");

        // Transfer token_out from contract → sender
        TokenClient::new(&env, &token_out).transfer(&env.current_contract_address(), &sender, &amount_out);

        // Persist last rate (scaled by 1_000_000 for fixed-point)
        let rate: i128 = (amount_out * 1_000_000) / amount_in;
        env.storage().instance().set(&DataKey::LastSwapRate, &rate);

        // Increment total swaps counter
        let total: u64 = env.storage().instance().get(&DataKey::TotalSwaps).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalSwaps, &(total + 1));

        // Emit event — picked up by frontend event listeners
        env.events().publish(
            (SWAP_TOPIC, symbol_short!("exec")),
            (sender.clone(), token_in, token_out, amount_in, amount_out),
        );

        amount_out
    }

    // ── Read-only helpers ────────────────────────────────────────────────────

    /// Returns the last swap rate scaled by 1_000_000 (i.e. 1.0 → 1_000_000).
    pub fn get_last_rate(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::LastSwapRate).unwrap_or(1_000_000)
    }

    /// Returns the total number of successful swaps executed.
    pub fn get_total_swaps(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalSwaps).unwrap_or(0)
    }

    /// Returns the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

// ── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register(TokenSwapContract, ());
        let client = TokenSwapContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_total_swaps(), 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let env = Env::default();
        let contract_id = env.register(TokenSwapContract, ());
        let client = TokenSwapContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        client.initialize(&admin); // should panic
    }
}

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token::TokenClient,
    Address, Env, Symbol,
};

// ── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    LastSwapRate,
    TotalSwaps,
}

// ── Event topics ──────────────────────────────────────────────────────────────

const SWAP_TOPIC: Symbol = symbol_short!("swap");

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct TokenSwapContract;

#[contractimpl]
impl TokenSwapContract {
    /// One-time initialisation — stores the admin address.
    ///
    /// Run once after deploying:
    ///   stellar contract invoke --id <ID> -- initialize --admin <ADDR>
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            // Cannot initialise twice
            env.storage().instance().set(&DataKey::Admin, &admin);
        } else {
            env.storage().instance().set(&DataKey::Admin, &admin);
            env.storage().instance().set(&DataKey::TotalSwaps, &0u64);
        }
    }

    /// Execute a swap:
    ///  - transfers `amount_in` of `token_in` from `sender` → contract
    ///  - transfers `amount_in` of `token_out` from contract → `sender` (1:1 demo)
    ///  - emits a `swap` / `exec` event
    pub fn swap(
        env: Env,
        sender: Address,
        token_in: Address,
        token_out: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        sender.require_auth();

        // Transfer token_in from sender → contract
        TokenClient::new(&env, &token_in).transfer(
            &sender,
            &env.current_contract_address(),
            &amount_in,
        );

        // 1:1 exchange for testnet demo
        let amount_out = amount_in;

        // Transfer token_out from contract → sender
        TokenClient::new(&env, &token_out).transfer(
            &env.current_contract_address(),
            &sender,
            &amount_out,
        );

        // Persist rate (scaled ×1_000_000)
        let rate: i128 = 1_000_000;
        env.storage().instance().set(&DataKey::LastSwapRate, &rate);

        // Increment swap counter
        let total: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSwaps)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSwaps, &(total + 1));

        // Emit event
        env.events().publish(
            (SWAP_TOPIC, symbol_short!("exec")),
            (token_in, token_out, amount_in, amount_out),
        );

        amount_out
    }

    /// Returns the last swap rate scaled ×1_000_000.
    pub fn get_last_rate(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::LastSwapRate)
            .unwrap_or(1_000_000)
    }

    /// Returns the total number of successful swaps.
    pub fn get_total_swaps(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSwaps)
            .unwrap_or(0)
    }

    /// Returns the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

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
}

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HwB325tYBpE7pAzZshMBCZo3PRCpdwwwLtsRy6t8NjDg");

#[program]
pub mod solana_forge {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        instructions::initialize_user::handle_initialize_user(ctx)
    }

    pub fn create_standard_token(
        ctx: Context<CreateStandardToken>,
        args: CreateStandardArgs,
    ) -> Result<()> {
        instructions::create_standard_token::handle_create_standard_token(ctx, args)
    }

    pub fn create_token_2022(
        ctx: Context<CreateToken2022>,
        args: CreateToken2022Args,
    ) -> Result<()> {
        instructions::create_token_2022::handle_create_token_2022(ctx, args)
    }

    // --- Dloom Locker Proxies ---

    pub fn proxy_lock_tokens(
        ctx: Context<ProxyLockTokens>,
        amount: u64,
        unlock_timestamp: i64,
        lock_id: u64,
    ) -> Result<()> {
        instructions::proxy_lock_tokens::handle_proxy_lock_tokens(
            ctx,
            amount,
            unlock_timestamp,
            lock_id,
        )
    }

    pub fn proxy_withdraw_tokens(
        ctx: Context<ProxyWithdrawTokens>,
        lock_id: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::proxy_withdraw_tokens::handle_proxy_withdraw_tokens(ctx, lock_id, amount)
    }

    pub fn proxy_close_vault(ctx: Context<ProxyCloseVault>, lock_id: u64) -> Result<()> {
        instructions::proxy_close_vault::handle_proxy_close_vault(ctx, lock_id)
    }

    pub fn proxy_burn_from_wallet(ctx: Context<ProxyBurnFromWallet>, amount: u64) -> Result<()> {
        instructions::proxy_burn_from_wallet::handle_proxy_burn_from_wallet(ctx, amount)
    }

    pub fn proxy_burn_batch<'info>(
        ctx: Context<'_, '_, '_, 'info, ProxyBurnBatch<'info>>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        instructions::proxy_burn_batch::handle_proxy_burn_batch(ctx, amounts)
    }
    
    pub fn proxy_burn_from_lock(
        ctx: Context<ProxyBurnFromLock>,
        amount: u64,
        lock_id: u64,
    ) -> Result<()> {
        instructions::proxy_burn_from_lock::handle_proxy_burn_from_lock(ctx, amount, lock_id)
    }

    // --- NEW PROXIES FOR HISTORY TRACKING ---

    pub fn proxy_transfer(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        instructions::transfer_token::handle_transfer_token(ctx, amount)
    }

    pub fn proxy_mint_to(ctx: Context<ProxyMintTo>, amount: u64) -> Result<()> {
        instructions::proxy_mint_to::handle_proxy_mint_to(ctx, amount)
    }

    pub fn update_token_metadata(
        ctx: Context<UpdateTokenMetadata>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::update_token_metadata::handle_update_token_metadata(ctx, name, symbol, uri)
    }
}

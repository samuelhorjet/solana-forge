// FILE: programs/solana_forge/src/instructions/proxy_burn_batch.rs
use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use dloom_locker::cpi::accounts::BurnBatch;
use dloom_locker::program::DloomLocker;
use crate::events::BatchBurnEvent;

#[derive(Accounts)]
pub struct ProxyBurnBatch<'info> {
    #[account(mut)]
    pub burner: Signer<'info>,

    pub locker_program: Program<'info, DloomLocker>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_proxy_burn_batch<'info>(
    ctx: Context<'_, '_, '_, 'info, ProxyBurnBatch<'info>>, 
    amounts: Vec<u64>
) -> Result<()> {
    // Collect mint keys from remaining accounts to emit a local event.
    let mut burned_mints = Vec::new();
    for i in 0..amounts.len() {
        let mint_info = &ctx.remaining_accounts[i * 2];
        burned_mints.push(mint_info.key());
    }

    // Prepare the CPI to the dloom_locker's new `handle_burn_batch` instruction.
    let cpi_accounts = BurnBatch {
        burner: ctx.accounts.burner.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.locker_program.to_account_info(), 
        cpi_accounts
    ).with_remaining_accounts(ctx.remaining_accounts.to_vec());

    // Execute the CPI.
    dloom_locker::cpi::handle_burn_batch(cpi_ctx, amounts.clone())?;

    // Emit the forge-level batch event for local tracking.
    emit!(BatchBurnEvent {
        burner: ctx.accounts.burner.key(),
        mints: burned_mints,
        amounts,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
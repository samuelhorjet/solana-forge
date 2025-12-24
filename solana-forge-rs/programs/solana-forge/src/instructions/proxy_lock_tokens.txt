use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use dloom_locker::cpi::accounts::LockTokens;
use dloom_locker::program::DloomLocker;
use crate::events::TokenLockedEvent;

#[derive(Accounts)]
pub struct ProxyLockTokens<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Validated by CPI to dloom-locker
    #[account(mut)]
    pub lock_record: UncheckedAccount<'info>,

    /// CHECK: Validated by CPI to dloom-locker
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub locker_program: Program<'info, DloomLocker>, 
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_proxy_lock_tokens(
    ctx: Context<ProxyLockTokens>, 
    amount: u64, 
    unlock_timestamp: i64, 
    lock_id: u64
) -> Result<()> {
    let cpi_accounts = LockTokens {
        owner: ctx.accounts.owner.to_account_info(),
        token_mint: ctx.accounts.token_mint.to_account_info(),
        lock_record: ctx.accounts.lock_record.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        user_token_account: ctx.accounts.user_token_account.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.locker_program.to_account_info(), cpi_accounts);
    dloom_locker::cpi::handle_lock_tokens(cpi_ctx, amount, unlock_timestamp, lock_id)?;
    
    // EMIT EVENT
    emit!(TokenLockedEvent {
        mint: ctx.accounts.token_mint.key(),
        amount,
        lock_id,
        unlock_date: unlock_timestamp,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
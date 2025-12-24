use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};
use dloom_locker::cpi::accounts::BurnFromLock;
use dloom_locker::program::DloomLocker;
use crate::events::LockedBurnEvent;

#[derive(Accounts)]
pub struct ProxyBurnFromLock<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Validated by CPI
    #[account(mut)]
    pub lock_record: UncheckedAccount<'info>,

    /// CHECK: Validated by CPI
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub locker_program: Program<'info, DloomLocker>,
}

pub fn handle_proxy_burn_from_lock(ctx: Context<ProxyBurnFromLock>, amount: u64, lock_id: u64) -> Result<()> {
    let cpi_accounts = BurnFromLock {
        owner: ctx.accounts.owner.to_account_info(),
        token_mint: ctx.accounts.token_mint.to_account_info(),
        lock_record: ctx.accounts.lock_record.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.locker_program.to_account_info(), cpi_accounts);
    dloom_locker::cpi::handle_burn_from_lock(cpi_ctx, amount, lock_id)?;

    emit!(LockedBurnEvent {
        mint: ctx.accounts.token_mint.key(),
        amount,
        from_lock: false,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use dloom_locker::cpi::accounts::BurnFromWallet;
use dloom_locker::program::DloomLocker;
use crate::events::WalletBurnEvent;

#[derive(Accounts)]
pub struct ProxyBurnFromWallet<'info> {
    #[account(mut)]
    pub burner: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub locker_program: Program<'info, DloomLocker>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_proxy_burn_from_wallet(ctx: Context<ProxyBurnFromWallet>, amount: u64) -> Result<()> {
    let cpi_accounts = BurnFromWallet {
        burner: ctx.accounts.burner.to_account_info(),
        token_mint: ctx.accounts.token_mint.to_account_info(),
        user_token_account: ctx.accounts.user_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.locker_program.to_account_info(), cpi_accounts);
    dloom_locker::cpi::handle_burn_from_wallet(cpi_ctx, amount)?;

    emit!(WalletBurnEvent {
        mint: ctx.accounts.token_mint.key(),
        amount,
        from_lock: false,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
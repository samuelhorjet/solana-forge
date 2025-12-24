use crate::events::TokenWithdrawnEvent;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use dloom_locker::cpi::accounts::WithdrawTokens;
use dloom_locker::program::DloomLocker;

#[derive(Accounts)]
pub struct ProxyWithdrawTokens<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Validated by CPI to dloom-locker
    #[account(mut)]
    pub lock_record: UncheckedAccount<'info>,

    /// CHECK: Validated by CPI to dloom-locker
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub locker_program: Program<'info, DloomLocker>,
}

// CHANGE 1: Accept `amount` in arguments
pub fn handle_proxy_withdraw_tokens(
    ctx: Context<ProxyWithdrawTokens>,
    lock_id: u64,
    amount: u64,
) -> Result<()> {
    // 1. Snapshot balance before withdraw
    let pre_balance = ctx.accounts.user_token_account.amount;

    let cpi_accounts = WithdrawTokens {
        owner: ctx.accounts.owner.to_account_info(),
        lock_record: ctx.accounts.lock_record.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        user_token_account: ctx.accounts.user_token_account.to_account_info(),
        token_mint: ctx.accounts.token_mint.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.locker_program.to_account_info(), cpi_accounts);

    // CHANGE 2: Pass `amount` to the CPI call
    dloom_locker::cpi::handle_withdraw_tokens(cpi_ctx, lock_id, amount)?;

    // 2. Reload account to get new balance
    ctx.accounts.user_token_account.reload()?;
    let post_balance = ctx.accounts.user_token_account.amount;

    // 3. Calculate actual withdrawn amount
    let amount_withdrawn = post_balance.saturating_sub(pre_balance);

    // 4. Emit Event if > 0
    if amount_withdrawn > 0 {
        emit!(TokenWithdrawnEvent {
            mint: ctx.accounts.token_mint.key(),
            owner: ctx.accounts.owner.key(),
            amount: amount_withdrawn,
            lock_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
    }

    Ok(())
}

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface, Mint, TransferChecked};
use crate::events::TokenTransferredEvent;

#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
    let decimals = ctx.accounts.mint.decimals;

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.from.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token_interface::transfer_checked(cpi_ctx, amount, decimals)?;

    emit!(TokenTransferredEvent {
        mint: ctx.accounts.mint.key(),
        from: ctx.accounts.authority.key(),
        to: ctx.accounts.to.key(), 
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
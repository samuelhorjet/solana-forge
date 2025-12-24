use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface, Mint, MintTo};
use crate::events::TokenMintedEvent;

#[derive(Accounts)]
pub struct ProxyMintTo<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_proxy_mint_to(ctx: Context<ProxyMintTo>, amount: u64) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token_interface::mint_to(cpi_ctx, amount)?;

    emit!(TokenMintedEvent {
        mint: ctx.accounts.mint.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
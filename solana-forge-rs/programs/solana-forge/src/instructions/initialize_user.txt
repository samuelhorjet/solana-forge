use anchor_lang::prelude::*;
use crate::state::UserAccount;

pub const USER_SEED: &[u8] = b"user";

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init, 
        payer = payer, 
        space = 8 + 32 + 8, 
        seeds = [USER_SEED, payer.key().as_ref()], 
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
    let ua = &mut ctx.accounts.user_account;
    ua.authority = ctx.accounts.payer.key();
    ua.token_count = 0;
    msg!("User account initialized for {}", ctx.accounts.payer.key());
    Ok(())
}
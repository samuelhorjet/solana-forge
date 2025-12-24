use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, sysvar},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, MintTo as TokenMintTo, SetAuthority as TokenSetAuthority},
};
use mpl_token_metadata::{
    instructions::CreateBuilder,
    types::{CreateArgs, Creator, PrintSupply, TokenStandard as MplTokenStandard},
};
use crate::{state::UserAccount, errors::ForgeError, events::StandardTokenCreatedEvent};

#[derive(Accounts)]
#[instruction(args: CreateStandardArgs)] // <--- ADDED THIS
pub struct CreateStandardToken<'info> {
    #[account(mut, has_one = authority)]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = args.decimals, // <--- CHANGED THIS (from decimals to args.decimals)
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: Account<'info, anchor_spl::token::Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(
        mut, 
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint.key().as_ref()], 
        bump,
        seeds::program = token_metadata_program.to_account_info()
    )]
    /// CHECK: Passed to Metaplex
    pub metadata: UncheckedAccount<'info>,

    #[account(address = mpl_token_metadata::ID)]
    /// CHECK: Verified by address
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,

    #[account(address = sysvar::instructions::ID)]
    /// CHECK: Sysvar
    pub instructions: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateStandardArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub initial_supply: u64,
    pub revoke_update_authority: bool,
    pub revoke_mint_authority: bool,
}

pub fn handle_create_standard_token(
    ctx: Context<CreateStandardToken>,
    args: CreateStandardArgs
) -> Result<()> {
    
    // 1. Create Metaplex Metadata
    let creators = vec![Creator {
        address: ctx.accounts.authority.key(),
        verified: true,
        share: 100,
    }];

    let create_args = CreateArgs::V1 {
        name: args.name.clone(),    
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),      
        seller_fee_basis_points: 0,
        creators: Some(creators),
        is_mutable: !args.revoke_update_authority,
        token_standard: MplTokenStandard::Fungible,
        primary_sale_happened: false,
        collection: None,
        uses: None,
        collection_details: None,
        rule_set: None,
        decimals: Some(args.decimals),
        print_supply: Some(PrintSupply::Zero),
    };

    let create_ix = CreateBuilder::new()
        .metadata(ctx.accounts.metadata.key())
        .mint(ctx.accounts.mint.key(), false)
        .authority(ctx.accounts.authority.key())
        .payer(ctx.accounts.authority.key())
        .update_authority(ctx.accounts.authority.key(), false)
        .create_args(create_args)
        .instruction();

    invoke(
        &create_ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(), // Payer
            ctx.accounts.authority.to_account_info(), // Mint Auth
            ctx.accounts.authority.to_account_info(), // Update Auth
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.instructions.to_account_info(),
        ],
    )?;

    // 2. Mint Initial Supply
    if args.initial_supply > 0 {
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TokenMintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            args.initial_supply,
        )?;
    }

    // 3. Revoke Mint Authority if requested
    if args.revoke_mint_authority {
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TokenSetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.authority.to_account_info(),
                }
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            None, 
        )?;
    }

    // 4. Update User Stats & Emit Event
    let ua = &mut ctx.accounts.user_account;
    ua.token_count = ua.token_count.checked_add(1).ok_or(ForgeError::Overflow)?;

    emit!(StandardTokenCreatedEvent {
        mint: ctx.accounts.mint.key(),
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        supply: args.initial_supply,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
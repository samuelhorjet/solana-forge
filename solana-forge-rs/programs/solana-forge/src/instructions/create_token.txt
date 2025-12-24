use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction, sysvar},
};
use anchor_spl::{
    associated_token::{self, AssociatedToken, Create as CreateAta},
    token::{self, MintTo as TokenMintTo, SetAuthority as TokenSetAuthority},
    token_2022::{self, MintTo as Token2022MintTo, ThawAccount, SetAuthority as Token2022SetAuthority},
    token_interface::{TokenInterface},
};
use spl_token_2022::{
    extension::{
        ExtensionType,
        interest_bearing_mint::instruction as interest_ix,
        transfer_fee::instruction as transfer_fee_ix,
        default_account_state::instruction as default_state_ix,
        metadata_pointer::instruction as metadata_pointer_ix, // Added for Native Metadata
    },
    instruction::{initialize_permanent_delegate, initialize_non_transferable_mint},
    state::AccountState,
};
use mpl_token_metadata::{
    instructions::CreateBuilder,
    types::{CreateArgs, Creator, PrintSupply, TokenStandard as MplTokenStandard},
};
use crate::{state::UserAccount, errors::ForgeError, events::TokenCreatedEvent};

// =========================================================================
// INSTRUCTION 1: Create Standard Token (Legacy)
// =========================================================================

#[derive(Accounts)]
pub struct CreateStandardToken<'info> {
    #[account(mut, has_one = authority)]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
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

    emit!(TokenCreatedEvent {
        mint: ctx.accounts.mint.key(),
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        supply: args.initial_supply,
        token_program: ctx.accounts.token_program.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}


// =========================================================================
// INSTRUCTION 2: Create Token-2022 (Modern with Extensions)
// =========================================================================

#[derive(Accounts)]
#[instruction(args: CreateToken2022Args)]
pub struct CreateToken2022<'info> {
    #[account(mut, has_one = authority)]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, signer)]
    /// CHECK: Manually initialized via System Program to handle Extensions resizing
    pub mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Manually initialized via CPI to Associated Token Program
    pub token_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, anchor_spl::token_2022::Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateToken2022Args {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub initial_supply: u64,
    pub transfer_fee_basis_points: u16,
    pub interest_rate: i16,
    pub is_non_transferable: bool,
    pub enable_permanent_delegate: bool,
    pub default_account_state_frozen: bool,
    pub revoke_update_authority: bool,
    pub revoke_mint_authority: bool,
}

pub fn handle_create_token_2022(
    ctx: Context<CreateToken2022>,
    args: CreateToken2022Args
) -> Result<()> {
    let token_program_id = ctx.accounts.token_program.key();
    let authority_key = ctx.accounts.authority.key();
    
    // 1. Calculate Space (Mint + Extensions + Native Metadata)
    let mut extensions = vec![ExtensionType::MetadataPointer]; // Always add Metadata Pointer
    if args.transfer_fee_basis_points > 0 { extensions.push(ExtensionType::TransferFeeConfig); }
    if args.interest_rate > 0 { extensions.push(ExtensionType::InterestBearingConfig); }
    if args.is_non_transferable { extensions.push(ExtensionType::NonTransferable); }
    if args.enable_permanent_delegate { extensions.push(ExtensionType::PermanentDelegate); }
    if args.default_account_state_frozen { extensions.push(ExtensionType::DefaultAccountState); }
    
    let base_size = ExtensionType::try_calculate_account_len::<spl_token_2022::state::Mint>(&extensions)?;

    // Calculate metadata size
    let metadata_len = 4 + // extra vector padding
        4 + args.name.len() + 
        4 + args.symbol.len() + 
        4 + args.uri.len() + 
        200; // Buffer for safety

    let total_len = base_size + metadata_len;
    let lamports = ctx.accounts.rent.minimum_balance(total_len);

    // 2. Create Account
    invoke(
        &system_instruction::create_account(
            &authority_key,
            &ctx.accounts.mint.key(),
            lamports,
            total_len as u64,
            &token_program_id,
        ),
        &[
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // 3. Initialize Metadata Pointer (Must happen BEFORE Init Mint)
    invoke(
        &metadata_pointer_ix::initialize(
            &token_program_id,
            &ctx.accounts.mint.key(),
            Some(authority_key),
            Some(ctx.accounts.mint.key()), // Point to self
        )?,
        &[ctx.accounts.mint.to_account_info(), ctx.accounts.authority.to_account_info()]
    )?;

    // 4. Initialize Other Extensions
    if args.transfer_fee_basis_points > 0 {
        invoke(
            &transfer_fee_ix::initialize_transfer_fee_config(
                &token_program_id,
                &ctx.accounts.mint.key(),
                Some(&authority_key),
                Some(&authority_key),
                args.transfer_fee_basis_points,
                u64::MAX,
            )?,
            &[ctx.accounts.mint.to_account_info(), ctx.accounts.authority.to_account_info()]
        )?;
    }

    if args.interest_rate > 0 {
        invoke(
            &interest_ix::initialize(
                &token_program_id,
                &ctx.accounts.mint.key(),
                Some(authority_key),
                args.interest_rate,
            )?,
            &[ctx.accounts.mint.to_account_info(), ctx.accounts.authority.to_account_info()]
        )?;
    }

    if args.is_non_transferable {
        invoke(
            &initialize_non_transferable_mint(&token_program_id, &ctx.accounts.mint.key())?,
            &[ctx.accounts.mint.to_account_info()]
        )?;
    }

    if args.enable_permanent_delegate {
        invoke(
            &initialize_permanent_delegate(
                &token_program_id, 
                &ctx.accounts.mint.key(), 
                &authority_key
            )?,
            &[ctx.accounts.mint.to_account_info()]
        )?;
    }

    if args.default_account_state_frozen {
        invoke(
            &default_state_ix::initialize_default_account_state(
                &token_program_id,
                &ctx.accounts.mint.key(),
                &AccountState::Frozen,
            )?,
            &[ctx.accounts.mint.to_account_info()]
        )?;
    }

    // 5. Initialize Mint
    token_2022::initialize_mint(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::InitializeMint {
                mint: ctx.accounts.mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            }
        ),
        args.decimals,
        &authority_key,
        Some(&authority_key), // Freeze authority needed for some extensions
    )?;

    // 6. Initialize Native Metadata
    invoke(
        &spl_token_metadata_interface::instruction::initialize(
            &token_program_id,
            &ctx.accounts.mint.key(),
            &authority_key,
            &ctx.accounts.mint.key(),
            &authority_key,
            args.name.clone(),
            args.symbol.clone(),
            args.uri.clone(),
        ),
        &[ctx.accounts.mint.to_account_info(), ctx.accounts.authority.to_account_info()]
    )?;

    // 7. Create Associated Token Account
    associated_token::create(
        CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            CreateAta {
                payer: ctx.accounts.authority.to_account_info(),
                associated_token: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ),
    )?;

    // 8. Mint Initial Supply
    if args.initial_supply > 0 {
        // Fix for Default Frozen state: Thaw before minting
        if args.default_account_state_frozen {
            token_2022::thaw_account(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    ThawAccount {
                        account: ctx.accounts.token_account.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    }
                )
            )?;
        }

        token_2022::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Token2022MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            args.initial_supply,
        )?;
    }

    // 9. Handle Revocations
    if args.revoke_mint_authority {
        token_2022::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Token2022SetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.authority.to_account_info(),
                }
            ),
            anchor_spl::token_2022::spl_token_2022::instruction::AuthorityType::MintTokens,
            None, 
        )?;
    }

    if args.revoke_update_authority {
         // With Native Metadata, we set the authority to None
        invoke(
            &spl_token_metadata_interface::instruction::update_authority(
                &token_program_id,
                &ctx.accounts.mint.key(),
                &authority_key,
                None, // Set to None
            ),
            &[ctx.accounts.mint.to_account_info(), ctx.accounts.authority.to_account_info()]
        )?;
    }

    // 10. Update User Stats & Emit Event
    let ua = &mut ctx.accounts.user_account;
    ua.token_count = ua.token_count.checked_add(1).ok_or(ForgeError::Overflow)?;

    emit!(TokenCreatedEvent {
        mint: ctx.accounts.mint.key(),
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        supply: args.initial_supply,
        token_program: token_program_id, 
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
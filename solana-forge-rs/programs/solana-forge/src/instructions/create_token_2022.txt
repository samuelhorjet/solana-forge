use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction},
};
use anchor_spl::{
    associated_token::{self, AssociatedToken, Create as CreateAta},
    token_2022::{
        self, MintTo as Token2022MintTo, SetAuthority as Token2022SetAuthority, ThawAccount,
    },
};
use solana_address::Address;
use spl_pod::optional_keys::OptionalNonZeroPubkey;
use spl_token_2022::{
    extension::{
        default_account_state::instruction as default_state_ix,
        interest_bearing_mint::instruction as interest_ix,
        metadata_pointer::instruction as metadata_pointer_ix,
        transfer_fee::instruction as transfer_fee_ix, ExtensionType,
    },
    instruction::{initialize_non_transferable_mint, initialize_permanent_delegate},
    state::AccountState,
};
use spl_token_metadata_interface::instruction as metadata_ix;

use crate::{errors::ForgeError, events::Token2022CreatedEvent, state::UserAccount};

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
    args: CreateToken2022Args,
) -> Result<()> {
    let token_program_id = ctx.accounts.token_program.key();
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();

    // 1. Calculate Space (Mint + Fixed Extensions ONLY)
    // We rely on Reallocation for the variable length Metadata later.
    let mut extensions = vec![ExtensionType::MetadataPointer];
    if args.transfer_fee_basis_points > 0 {
        extensions.push(ExtensionType::TransferFeeConfig);
    }
    if args.interest_rate > 0 {
        extensions.push(ExtensionType::InterestBearingConfig);
    }
    if args.is_non_transferable {
        extensions.push(ExtensionType::NonTransferable);
    }
    if args.enable_permanent_delegate {
        extensions.push(ExtensionType::PermanentDelegate);
    }
    if args.default_account_state_frozen {
        extensions.push(ExtensionType::DefaultAccountState);
    }

    // Fixed length for the Mint + Fixed Extensions
    let fixed_len =
        ExtensionType::try_calculate_account_len::<spl_token_2022::state::Mint>(&extensions)?;

    // 2. Calculate Variable Space for TokenMetadata
    // Layout: update_authority(32) + mint(32) + name(4+len) + symbol(4+len) + uri(4+len) + additional_metadata(4)
    let metadata_len = 32 + 32 + 
        4 + args.name.len() + 
        4 + args.symbol.len() + 
        4 + args.uri.len() + 
        4; 
    
    // Extension Header (Type + Len) in TLV = 4 bytes
    let extension_overhead = 4;
    
    // Total Rent required (Fixed + Variable + Safety Buffer)
    // We allocate 'fixed_len' data initially, but fund it for the Full Size.
    // The generous buffer (+500) ensures we cover alignment padding and any runtime overhead.
    let total_len_for_rent = fixed_len + extension_overhead + metadata_len + 500; 
    let lamports = ctx.accounts.rent.minimum_balance(total_len_for_rent);

    // 3. Create Account
    invoke(
        &system_instruction::create_account(
            &authority_key,
            &mint_key,
            lamports,       // Pre-funded for full future size
            fixed_len as u64, // Initial size (Mint + Fixed Extensions)
            &token_program_id,
        ),
        &[
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // 4. Initialize Metadata Pointer
    invoke(
        &metadata_pointer_ix::initialize(
            &token_program_id,
            &mint_key,
            Some(authority_key),
            Some(mint_key),
        )?,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
    )?;

    // 5. Initialize Other Extensions
    if args.transfer_fee_basis_points > 0 {
        invoke(
            &transfer_fee_ix::initialize_transfer_fee_config(
                &token_program_id,
                &mint_key,
                Some(&authority_key),
                Some(&authority_key),
                args.transfer_fee_basis_points,
                u64::MAX,
            )?,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
        )?;
    }

    if args.interest_rate > 0 {
        invoke(
            &interest_ix::initialize(
                &token_program_id,
                &mint_key,
                Some(authority_key),
                args.interest_rate,
            )?,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
        )?;
    }

    if args.is_non_transferable {
        invoke(
            &initialize_non_transferable_mint(&token_program_id, &mint_key)?,
            &[ctx.accounts.mint.to_account_info()],
        )?;
    }

    if args.enable_permanent_delegate {
        invoke(
            &initialize_permanent_delegate(&token_program_id, &mint_key, &authority_key)?,
            &[ctx.accounts.mint.to_account_info()],
        )?;
    }

    if args.default_account_state_frozen {
        invoke(
            &default_state_ix::initialize_default_account_state(
                &token_program_id,
                &mint_key,
                &AccountState::Frozen,
            )?,
            &[ctx.accounts.mint.to_account_info()],
        )?;
    }

    // 6. Initialize Mint (Standard)
    token_2022::initialize_mint(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::InitializeMint {
                mint: ctx.accounts.mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        args.decimals,
        &authority_key,
        Some(&authority_key),
    )?;

    // 7. Initialize Native Metadata (With Reallocation)
    let program_id_addr = to_address(&token_program_id);
    let mint_addr = to_address(&mint_key);
    let auth_addr = to_address(&authority_key);

    let init_metadata_ix = metadata_ix::initialize(
        &program_id_addr,
        &mint_addr,
        &auth_addr, // Update Authority
        &mint_addr, // Mint
        &auth_addr, // Mint Authority
        args.name.clone(),
        args.symbol.clone(),
        args.uri.clone(),
    );

    // Convert to Anchor instruction
    let mut anchor_ix = convert_instruction(init_metadata_ix);

    // Append the Payer account manually.
    // This tells Token-2022 to reallocate the account to fit the metadata.
    anchor_ix
        .accounts
        .push(anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: ctx.accounts.authority.key(),
            is_signer: true,
            is_writable: true,
        });

    // Append the System Program account manually.
    // This allows the Token Program to transfer lamports if our calculation was still slightly off.
    anchor_ix
        .accounts
        .push(anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: ctx.accounts.system_program.key(),
            is_signer: false,
            is_writable: false,
        });

    invoke(
        &anchor_ix,
        &[
            ctx.accounts.mint.to_account_info(),      // Metadata (Mint)
            ctx.accounts.authority.to_account_info(), // Update Authority
            ctx.accounts.mint.to_account_info(),      // Mint
            ctx.accounts.authority.to_account_info(), // Mint Authority
            ctx.accounts.authority.to_account_info(), // PAYER
            ctx.accounts.system_program.to_account_info(), // SYSTEM PROGRAM
        ],
    )?;

    // 8. Create Associated Token Account
    associated_token::create(CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        CreateAta {
            payer: ctx.accounts.authority.to_account_info(),
            associated_token: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        },
    ))?;

    // 9. Mint Initial Supply
    if args.initial_supply > 0 {
        if args.default_account_state_frozen {
            token_2022::thaw_account(CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ))?;
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

    // 10. Handle Revocations
    if args.revoke_mint_authority {
        token_2022::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Token2022SetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            anchor_spl::token_2022::spl_token_2022::instruction::AuthorityType::MintTokens,
            None,
        )?;
    }

    if args.revoke_update_authority {
        let update_auth_ix = metadata_ix::update_authority(
            &program_id_addr,
            &mint_addr,
            &auth_addr,
            OptionalNonZeroPubkey::default(),
        );

        invoke(
            &convert_instruction(update_auth_ix),
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
        )?;
    }

    // 11. Update User Stats & Emit Event
    let ua = &mut ctx.accounts.user_account;
    ua.token_count = ua.token_count.checked_add(1).ok_or(ForgeError::Overflow)?;

    emit!(Token2022CreatedEvent {
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

fn to_address(pubkey: &Pubkey) -> Address {
    Address::from(pubkey.to_bytes())
}

fn convert_instruction(
    ix: spl_token_metadata_interface::solana_instruction::Instruction,
) -> anchor_lang::solana_program::instruction::Instruction {
    anchor_lang::solana_program::instruction::Instruction {
        program_id: Pubkey::new_from_array(ix.program_id.to_bytes()),
        accounts: ix
            .accounts
            .into_iter()
            .map(
                |acc| anchor_lang::solana_program::instruction::AccountMeta {
                    pubkey: Pubkey::new_from_array(acc.pubkey.to_bytes()),
                    is_signer: acc.is_signer,
                    is_writable: acc.is_writable,
                },
            )
            .collect(),
        data: ix.data,
    }
}
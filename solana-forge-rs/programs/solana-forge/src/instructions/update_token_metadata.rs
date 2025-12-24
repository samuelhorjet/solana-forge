use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};
use crate::events::*;

// 1. IMPORTS FOR LATEST VERSION
use spl_token_metadata_interface::state::Field;
use spl_token_metadata_interface::instruction::update_field;
// Import the new Address type to perform casts
use solana_address::Address; 

#[derive(Accounts)]
pub struct UpdateTokenMetadata<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    // In Token Extensions, the Mint Account IS the Metadata Account
    pub metadata: InterfaceAccount<'info, Mint>, 

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_update_token_metadata(
    ctx: Context<UpdateTokenMetadata>, 
    name: String, 
    symbol: String, 
    uri: String
) -> Result<()> {
    
    // Update Name
    update_metadata_field(&ctx, Field::Name, name.clone())?;
    
    // Update Symbol
    update_metadata_field(&ctx, Field::Symbol, symbol.clone())?;
    
    // Update Uri
    update_metadata_field(&ctx, Field::Uri, uri.clone())?;

    emit!(MetadataUpdatedEvent {
        mint: ctx.accounts.metadata.key(),
        name,
        symbol,
        uri,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// 3. UPDATED HELPER FUNCTION WITH TYPE CONVERSION
fn update_metadata_field(
    ctx: &Context<UpdateTokenMetadata>, 
    field: Field, 
    value: String
) -> Result<()> {
    
    // Convert Anchor Pubkeys to new Agave Addresses
    let program_id = to_address(&spl_token_2022::ID);
    let metadata_addr = to_address(&ctx.accounts.metadata.key());
    let authority_addr = to_address(&ctx.accounts.authority.key());

    // Generate the instruction using the NEW interface (returns solana_instruction::Instruction)
    let new_ix = update_field(
        &program_id,      
        &metadata_addr,     
        &authority_addr,    
        field,                            
        value,                            
    );

    // Convert the new Instruction type back to Anchor's expected Instruction type
    let anchor_ix = adapt_instruction(new_ix);

    anchor_lang::solana_program::program::invoke(
        &anchor_ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
    )?;

    Ok(())
}

// --- ADAPTER HELPERS ---

/// Converts Anchor/Solana Pubkey to new Agave Address
fn to_address(pubkey: &Pubkey) -> Address {
    Address::from(pubkey.to_bytes())
}

/// Adapts the new solana_instruction::Instruction (used by SPL v9)
/// to the solana_program::instruction::Instruction (used by Anchor)
fn adapt_instruction(
    ix: spl_token_metadata_interface::solana_instruction::Instruction
) -> anchor_lang::solana_program::instruction::Instruction {
    anchor_lang::solana_program::instruction::Instruction {
        program_id: Pubkey::new_from_array(ix.program_id.to_bytes()),
        accounts: ix.accounts.into_iter().map(|acc| {
            anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: Pubkey::new_from_array(acc.pubkey.to_bytes()),
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }
        }).collect(),
        data: ix.data,
    }
}
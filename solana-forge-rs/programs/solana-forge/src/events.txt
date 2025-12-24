use anchor_lang::prelude::*;

#[event]
pub struct StandardTokenCreatedEvent {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct Token2022CreatedEvent {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub supply: u64,
    pub token_program: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletBurnEvent {
    pub mint: Pubkey,
    pub amount: u64,
    pub from_lock: bool,
    pub timestamp: i64,
}

#[event]
pub struct LockedBurnEvent {
    pub mint: Pubkey,
    pub amount: u64,
    pub from_lock: bool,
    pub timestamp: i64,
}

#[event]
pub struct BatchBurnEvent {
    pub burner: Pubkey,
    pub mints: Vec<Pubkey>,
    pub amounts: Vec<u64>,
    pub timestamp: i64,
}

#[event]
pub struct TokenLockedEvent {
    pub mint: Pubkey,
    pub amount: u64,
    pub lock_id: u64,
    pub unlock_date: i64,
    pub timestamp: i64,
}

#[event]
pub struct TokenTransferredEvent {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenMintedEvent {
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenWithdrawnEvent {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub lock_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultClosedEvent {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub lock_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct MetadataUpdatedEvent {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub timestamp: i64,
}
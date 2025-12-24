use anchor_lang::prelude::*;

#[error_code]
pub enum ForgeError {
    #[msg("Arithmetic overflow")]
    Overflow,
}
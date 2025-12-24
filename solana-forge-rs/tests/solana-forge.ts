import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaForge } from "../target/types/solana_forge";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getExtensionTypes,
  ExtensionType,
  getMetadataPointerState,
  getTransferFeeConfig,
  getInterestBearingMintConfigState,
  getPermanentDelegate,
  getDefaultAccountState,
  AccountState,
  getTokenMetadata,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("solana-forge", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaForge as Program<SolanaForge>;
  const wallet = provider.wallet as anchor.Wallet;

  // Derive User Account PDA
  const [userAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), wallet.publicKey.toBuffer()],
    program.programId
  );

  // Default Arguments helper
  const defaultArgs = {
    name: "Test Token",
    symbol: "TEST",
    uri: "https://example.com/test.json",
    decimals: 9,
    initialSupply: new anchor.BN(1000 * 10 ** 9),
    transferFeeBasisPoints: 0,
    interestRate: 0,
    isNonTransferable: false,
    enablePermanentDelegate: false,
    defaultAccountStateFrozen: false,
    revokeUpdateAuthority: false,
    revokeMintAuthority: false,
  };

  it("Initializes User", async () => {
    try {
      await program.methods
        .initializeUser()
        .accountsPartial({
          userAccount: userAccount,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ User Initialized");
    } catch (e) {
      console.log("ℹ️ User already initialized");
    }
  });

  // =================================================================
  // TEST 1: STANDARD LEGACY TOKEN
  // =================================================================
  it("Creates a Standard Token (Legacy)", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const metadataProgramId = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        metadataProgramId.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      metadataProgramId
    );

    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const args = {
      name: "Legacy Token",
      symbol: "LEG",
      uri: "https://example.com/legacy.json",
      decimals: 9,
      initialSupply: new anchor.BN(1000 * 10 ** 9),
      revokeUpdateAuthority: false,
      revokeMintAuthority: false,
    };

    const tx = await program.methods
      .createStandardToken(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        metadata: metadataAddress,
        tokenMetadataProgram: metadataProgramId,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("✅ Legacy Token Created. Tx:", tx);

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_PROGRAM_ID
    );
    assert.equal(mintInfo.decimals, 9);
  });

  // =================================================================
  // TEST 2: TOKEN-2022 (Transfer Fees)
  // =================================================================
  it("Creates Token-2022 with Transfer Fees", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Enable ONLY Transfer Fee
    const args = {
      ...defaultArgs,
      name: "Fee Token",
      transferFeeBasisPoints: 500, // 5%
    };

    await program.methods
      .createToken2022(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const extensions = getExtensionTypes(mintInfo.tlvData);

    assert.isTrue(
      extensions.includes(ExtensionType.TransferFeeConfig),
      "Missing Transfer Fee Extension"
    );

    const feeConfig = getTransferFeeConfig(mintInfo);
    assert.equal(feeConfig?.newerTransferFee.transferFeeBasisPoints, 500);
    console.log("✅ Transfer Fee Token Verified");
  });

  // =================================================================
  // TEST 3: TOKEN-2022 (Interest Bearing)
  // =================================================================
  it("Creates Token-2022 with Interest Bearing", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Enable ONLY Interest Bearing
    const args = {
      ...defaultArgs,
      name: "Interest Token",
      interestRate: 50, // 0.5%
    };

    await program.methods
      .createToken2022(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const extensions = getExtensionTypes(mintInfo.tlvData);

    assert.isTrue(
      extensions.includes(ExtensionType.InterestBearingConfig),
      "Missing Interest Bearing Extension"
    );

    const interestConfig = getInterestBearingMintConfigState(mintInfo);
    assert.equal(interestConfig?.currentRate, 50);
    console.log("✅ Interest Bearing Token Verified");
  });

  // =================================================================
  // TEST 4: TOKEN-2022 (Non-Transferable / Soulbound)
  // =================================================================
  it("Creates Token-2022 Non-Transferable (Soulbound)", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Enable ONLY Non-Transferable
    const args = {
      ...defaultArgs,
      name: "Soulbound Token",
      isNonTransferable: true,
      // Usually Soulbound tokens also revoke update/mint authority to be truly immutable
      revokeUpdateAuthority: true,
      revokeMintAuthority: true,
    };

    await program.methods
      .createToken2022(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const extensions = getExtensionTypes(mintInfo.tlvData);

    assert.isTrue(
      extensions.includes(ExtensionType.NonTransferable),
      "Missing Non-Transferable Extension"
    );
    assert.isNull(mintInfo.mintAuthority, "Mint Authority should be revoked");

    console.log("✅ Non-Transferable Token Verified");
  });

  // =================================================================
  // TEST 5: TOKEN-2022 (Permanent Delegate + Default Frozen)
  // =================================================================
  it("Creates Token-2022 with Perm Delegate & Default Frozen", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // These two work well together
    const args = {
      ...defaultArgs,
      name: "Regulated Token",
      enablePermanentDelegate: true,
      defaultAccountStateFrozen: true,
    };

    await program.methods
      .createToken2022(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const extensions = getExtensionTypes(mintInfo.tlvData);

    assert.isTrue(
      extensions.includes(ExtensionType.PermanentDelegate),
      "Missing Perm Delegate"
    );
    assert.isTrue(
      extensions.includes(ExtensionType.DefaultAccountState),
      "Missing Default Account State"
    );

    const permDelegate = getPermanentDelegate(mintInfo);
    assert.equal(
      permDelegate?.delegate.toBase58(),
      wallet.publicKey.toBase58()
    );

    const defaultState = getDefaultAccountState(mintInfo);
    assert.equal(defaultState?.state, AccountState.Frozen);

    console.log("✅ Delegate & Frozen Token Verified");
  });

  // =================================================================
  // TEST 6: METADATA VERIFICATION
  // =================================================================
  it("Verifies Token-2022 Native Metadata", async () => {
    // Just create a simple T22 and check metadata
    const mintKeypair = anchor.web3.Keypair.generate();
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const args = { ...defaultArgs, name: "Metadata Test", symbol: "META" };

    await program.methods
      .createToken2022(args)
      .accountsPartial({
        userAccount: userAccount,
        authority: wallet.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const mintInfo = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const extensions = getExtensionTypes(mintInfo.tlvData);

    assert.isTrue(
      extensions.includes(ExtensionType.MetadataPointer),
      "Missing Metadata Pointer"
    );

    // Fetch the Actual Metadata from the Mint Account
    const metadata = await getTokenMetadata(
      provider.connection,
      mintKeypair.publicKey
    );
    assert.equal(metadata?.name, "Metadata Test");
    assert.equal(metadata?.symbol, "META");

    console.log("✅ Native Metadata Verified");
  });
});

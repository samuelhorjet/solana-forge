// FILE: hooks/useTokenOperations.ts

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey(
  "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
);

export function useTokenOperations() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program } = useProgram();

  const [isLoading, setIsLoading] = useState(false);

  const deriveLockerPDAs = useCallback(
    (lockId: BN, owner: PublicKey, tokenMint: PublicKey) => {
      const [lockRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lock_record"),
          owner.toBuffer(),
          tokenMint.toBuffer(),
          lockId.toArrayLike(Buffer, "le", 8),
        ],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), lockRecord.toBuffer()],
        DLOOM_LOCKER_PROGRAM_ID
      );
      return { lockRecord, vault };
    },
    []
  );

  const lockTokens = async (
    mintAddress: string,
    amount: number,
    decimals: number,
    unlockDate: Date,
    tokenProgramId: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      const mint = new PublicKey(mintAddress);
      const tokenProgram = new PublicKey(tokenProgramId);

      const lockIdBN = new BN(Date.now());
      const amountBN = new BN(amount * 10 ** decimals);
      const unlockTimestamp = new BN(Math.floor(unlockDate.getTime() / 1000));

      const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);

      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgram
      );

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyLockTokens(amountBN, unlockTimestamp, lockIdBN)
        .accountsPartial({
          owner: publicKey,
          tokenMint: mint,
          lockRecord: lockRecord,
          vault: vault,
          userTokenAccount: userTokenAccount,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // 3. Send & Confirm
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      return { signature: signature, lockId: lockIdBN.toString() };
    } catch (error) {
      console.error("Lock Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawTokens = async (
    mintAddress: string,
    lockIdStr: string,
    amount: number,
    decimals: number
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);
    try {
      const lockIdBN = new BN(lockIdStr);
      const amountBN = new BN(amount * 10 ** decimals); // Create a BN for the amount
      const mint = new PublicKey(mintAddress);
      const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);

      const tokenProgramId = new PublicKey(
        "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
      );
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgramId
      );

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyWithdrawTokens(lockIdBN, amountBN) // Pass both lockIdBN and amountBN
        .accountsPartial({
          owner: publicKey,
          lockRecord,
          vault,
          userTokenAccount,
          tokenMint: mint,
          tokenProgram: tokenProgramId,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // 3. Send & Confirm
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      return signature;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const burnFromWallet = async (
    mintAddress: string,
    amount: number,
    decimals: number,
    tokenProgramId: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      const mint = new PublicKey(mintAddress);
      const tokenProgram = new PublicKey(tokenProgramId);
      const amountBN = new BN(amount * 10 ** decimals);
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgram
      );

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyBurnFromWallet(amountBN)
        .accountsPartial({
          burner: publicKey,
          tokenMint: mint,
          userTokenAccount: userTokenAccount,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
          tokenProgram: tokenProgram,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // 3. Send & Confirm
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      return signature;
    } catch (error) {
      console.error("Burn Wallet Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const burnFromLock = async (
    mintAddress: string,
    lockIdStr: string,
    amount: number,
    decimals: number
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      const lockIdBN = new BN(lockIdStr);
      const amountBN = new BN(amount * 10 ** decimals);
      const mint = new PublicKey(mintAddress);
      const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyBurnFromLock(amountBN, lockIdBN)
        .accountsPartial({
          owner: publicKey,
          tokenMint: mint,
          lockRecord: lockRecord,
          vault: vault,
          tokenProgram: new PublicKey(
            "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          ),
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // 3. Send & Confirm
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      return signature;
    } catch (error) {
      console.error("Burn Lock Error", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    lockTokens,
    withdrawTokens,
    burnFromWallet,
    burnFromLock,
    isLoading,
  };
}

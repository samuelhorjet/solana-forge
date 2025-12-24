// FILE: hooks/useBurner.ts

import { useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useHistory, BatchDetail } from "@/components/history-provider";
import { BN } from "@coral-xyz/anchor";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey(
  "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
);

export interface BurnQueueItem {
  mint: string;
  symbol: string;
  amount: string; // Keep as string for precision
  decimals: number;
  balance: number;
  programId: string;
  image?: string;
}

export function useBurner() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } =
    useWallet();
  const { program } = useProgram();
  const [isLoading, setIsLoading] = useState(false);
  const { history, addHistoryItem} = useHistory();

  const burnHistory = useMemo(() => {
    return history.filter(
      (item) =>
        item.type === "Wallet Burn" ||
        item.type === "Vault Burn" ||
        item.type === "Batch Burn"
    );
  }, [history]);

  const toBaseUnitBN = (amount: string | number, decimals: number): BN => {
    const amountString = String(amount);
    if (isNaN(decimals) || decimals < 0) {
      throw new Error("Invalid decimals provided.");
    }
    const [integerPart, fractionalPart = ""] = amountString.split(".");
    if (fractionalPart.length > decimals) {
      throw new Error(
        "Amount has more decimal places than the token supports."
      );
    }
    const paddedFractionalPart = fractionalPart.padEnd(decimals, "0");
    const fullAmountString = integerPart + paddedFractionalPart;
    return new BN(fullAmountString);
  };

  const createBurnInstruction = async (
    mintAddress: string,
    amount: string | number,
    decimals: number,
    tokenProgramId: string
  ): Promise<TransactionInstruction> => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    const mint = new PublicKey(mintAddress);
    const tokenProgram = new PublicKey(tokenProgramId);
    const amountBN = toBaseUnitBN(amount, decimals);
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      publicKey,
      false,
      tokenProgram
    );
    return await program.methods
      .proxyBurnFromWallet(amountBN)
      .accountsPartial({
        burner: publicKey,
        tokenMint: mint,
        userTokenAccount: userTokenAccount,
        lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
        tokenProgram: tokenProgram,
      })
      .instruction();
  };

  const burnFromWallet = async (
    mintAddress: string,
    amount: number,
    decimals: number,
    tokenProgramId: string,
    tokenSymbol?: string,
    tokenImage?: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);
    try {
      const instruction = await createBurnInstruction(
        mintAddress,
        amount,
        decimals,
        tokenProgramId
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      let signature: string;
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
        });
      } else {
        signature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
        });
      }
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      addHistoryItem({
        signature,
        type: "Wallet Burn",
        mint: mintAddress,
        amount: amount,
        timestamp: Date.now(),
        status: "Success",
        symbol: tokenSymbol || "UNK",
        image: tokenImage || "",
        decimals: decimals,
      });
      return signature;
    } finally {
      setIsLoading(false);
    }
  };

  // --- MODIFICATION START: Corrected Batch Burn Logic ---
  const burnBatch = async (queue: BurnQueueItem[]) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    const CHUNK_SIZE = 8;
    const results = [];

    try {
      const allInstructionsWithMeta = [];
      for (const item of queue) {
        try {
          if (isNaN(item.decimals)) {
            console.error(
              "Skipping invalid item in batch (bad decimals):",
              item.symbol
            );
            continue;
          }
          const ix = await createBurnInstruction(
            item.mint,
            item.amount,
            item.decimals,
            item.programId
          );
          allInstructionsWithMeta.push({ ix, item });
        } catch (e) {
          console.error("Failed to create instruction for", item.symbol, e);
          results.push({
            success: false,
            mint: item.mint,
            error: "Failed to build instruction",
          });
        }
      }

      const transactions: VersionedTransaction[] = [];
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      for (let i = 0; i < allInstructionsWithMeta.length; i += CHUNK_SIZE) {
        const chunk = allInstructionsWithMeta.slice(i, i + CHUNK_SIZE);
        const instructions = chunk.map((c) => c.ix);
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: instructions,
        }).compileToV0Message();
        transactions.push(new VersionedTransaction(messageV0));
      }

      let signedTransactions: VersionedTransaction[] = [];
      if (signAllTransactions) {
        signedTransactions = await signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support signing all transactions.");
      }

      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        const chunkStartIndex = i * CHUNK_SIZE;
        const chunkMeta = allInstructionsWithMeta.slice(
          chunkStartIndex,
          chunkStartIndex + CHUNK_SIZE
        );

        try {
          const signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: true }
          );
          await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            "confirmed"
          );

          // CRITICAL FIX: Create ONE history item for the entire successful chunk.
          // This ensures the optimistic update matches the on-chain event structure.
          const batchDetailsForHistory: BatchDetail[] = chunkMeta.map(
            ({ item }) => ({
              mint: item.mint,
              symbol: item.symbol,
              amount: parseFloat(item.amount),
              image: item.image,
              decimals: item.decimals,
            })
          );

          const totalAmount = batchDetailsForHistory.reduce(
            (sum, item) => sum + item.amount,
            0
          );

          addHistoryItem({
            signature,
            type: "Batch Burn",
            mint: "Multiple Assets", // Correct placeholder
            amount: totalAmount,
            timestamp: Date.now(),
            status: "Success",
            symbol: "BATCH",
            batchDetails: batchDetailsForHistory, // Attach the detailed list
          });

          chunkMeta.forEach(({ item }) => {
            results.push({ success: true, mint: item.mint, tx: signature });
          });
        } catch (error) {
          console.error("Batch Chunk Failed", error);
          chunkMeta.forEach(({ item }) => {
            results.push({ success: false, mint: item.mint, error });
          });
        }
      }
      return results;
    } finally {
      setIsLoading(false);
    }
  };
  // --- MODIFICATION END ---

  const burnFromLock = async (
    mintAddress: string,
    lockIdStr: string,
    amount: number,
    decimals: number,
    tokenProgramId: string,
    tokenSymbol?: string,
    tokenImage?: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);
    try {
      const lockIdBN = new BN(lockIdStr);
      const amountBN = toBaseUnitBN(amount, decimals);
      const mint = new PublicKey(mintAddress);
      const tokenProgram = new PublicKey(tokenProgramId);
      const [lockRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lock_record"),
          publicKey.toBuffer(),
          mint.toBuffer(),
          lockIdBN.toArrayLike(Buffer, "le", 8),
        ],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), lockRecord.toBuffer()],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const instruction = await program.methods
        .proxyBurnFromLock(amountBN, lockIdBN)
        .accountsPartial({
          owner: publicKey,
          tokenMint: mint,
          lockRecord: lockRecord,
          vault: vault,
          tokenProgram: tokenProgram,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
        })
        .instruction();
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      let signature: string;
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
        });
      } else {
        signature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
        });
      }
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      addHistoryItem({
        signature,
        type: "Vault Burn",
        mint: mintAddress,
        amount: amount,
        timestamp: Date.now(),
        status: "Success",
        symbol: tokenSymbol || "UNK",
        image: tokenImage || "",
        decimals: decimals,
        lockId: lockIdStr,
      });
      return signature;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMaxBurnAmount = (
    balance: number,
    transferFeeConfig?: string
  ) => {
    if (!transferFeeConfig) return balance;
    try {
      const percentage = parseFloat(transferFeeConfig.replace("%", ""));
      if (isNaN(percentage) || percentage === 0) return balance;
      const rate = percentage / 100;
      const safeAmount = balance / (1 + rate);
      return Math.floor(safeAmount * 1_000_000) / 1_000_000;
    } catch (e) {
      return balance;
    }
  };

  return {
    burnFromWallet,
    burnFromLock,
    burnBatch,
    burnHistory,
    calculateMaxBurnAmount,
    isLoading,
  };
}

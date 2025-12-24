// FILE: hooks/useLocker.ts

import { useState, useCallback, useRef, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useProgram } from "@/components/solana-provider";
import { fetchTokenMetadata } from "@/hooks/useTokenMetadata";
import { useHistory } from "@/components/history-provider";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey(
  "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
);

export interface LockRecord {
  pubkey: string;
  lockId: string;
  amount: number;
  tokenMint: string;
  owner: string;
  unlockDate: Date;
  isUnlocked: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  decimals: number;
  image?: string;
  programId: string; // <-- FIX: Added programId to the record
}

export function useLocker() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { program } = useProgram();

  const [locks, setLocks] = useState<LockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshHistory } = useHistory();
  const lastFetchedKey = useRef<string | null>(null); // <-- MODIFICATION: Track last fetched user

  // --- HELPER: Decode Lock Record ---
  const decodeLockRecord = (buffer: Buffer, pubkey: PublicKey) => {
    try {
      let offset = 8;
      offset += 1;
      const owner = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const tokenMint = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const vault = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const amount = buffer.readBigUInt64LE(offset);
      offset += 8;
      const unlockTimestamp = buffer.readBigInt64LE(offset);
      offset += 8;
      const lockId = buffer.readBigUInt64LE(offset);

      return {
        owner,
        tokenMint,
        lockId: lockId.toString(),
        amount: Number(amount),
        unlockTimestamp: Number(unlockTimestamp),
      };
    } catch (e) {
      console.error("Failed to decode account", pubkey.toBase58(), e);
      return null;
    }
  };

  // --- FETCH LOCKS ---
  const fetchUserLocks = useCallback(async () => {
    if (!publicKey) return;

    // --- MODIFICATION START: Intelligent Loading State ---
    // Only show the skeleton loader if we haven't fetched for the current user yet.
    if (lastFetchedKey.current !== publicKey.toBase58()) {
      setIsLoading(true);
      setLocks([]); // Clear data from any previous user
    }
    // --- MODIFICATION END ---

    try {
      const accounts = await connection.getProgramAccounts(
        DLOOM_LOCKER_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 9,
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      );
      const formattedLocks: LockRecord[] = [];
      for (const acc of accounts) {
        const decoded = decodeLockRecord(acc.account.data, acc.pubkey);
        if (!decoded) continue;

        // Fetch Metadata
        const mint = decoded.tokenMint.toBase58();
        let decimals = 9;
        let metaName = "Unknown";
        let metaSymbol = "UNK";
        let imageUrl = "";
        let programId = TOKEN_PROGRAM_ID.toBase58(); // Default to standard

        // 1. Get Decimals and Program ID
        try {
          const mintInfo = await connection.getParsedAccountInfo(
            decoded.tokenMint
          );
          if (mintInfo.value) {
            // FIX: Get the program ID from the mint account's owner
            programId = mintInfo.value.owner.toBase58();
            if ((mintInfo.value?.data as any)?.parsed) {
              decimals = (mintInfo.value?.data as any).parsed.info.decimals;
            }
          }
        } catch (e) {}

        // 2. Get Metadata
        try {
          const meta = await fetchTokenMetadata(connection, mint);
          metaName = meta.name;
          metaSymbol = meta.symbol;
          if (meta.uri) {
            const cleanUri = meta.uri.replace(/\0/g, "").trim();
            if (cleanUri) {
              const response = await fetch(cleanUri);
              const json = await response.json();
              imageUrl = json.image || "";
            }
          }
        } catch (e) {}

        const amountUi = decoded.amount / 10 ** decimals;
        const unlockTime = new Date(decoded.unlockTimestamp * 1000);

        formattedLocks.push({
          pubkey: acc.pubkey.toBase58(),
          lockId: decoded.lockId,
          amount: amountUi,
          tokenMint: mint,
          owner: decoded.owner.toBase58(),
          unlockDate: unlockTime,
          isUnlocked: Date.now() > unlockTime.getTime(),
          tokenName: metaName,
          tokenSymbol: metaSymbol,
          decimals,
          image: imageUrl,
          programId, // <-- FIX: Save the correct programId
        });
      }
      setLocks(
        formattedLocks.sort(
          (a, b) => a.unlockDate.getTime() - b.unlockDate.getTime()
        )
      );
      // --- MODIFICATION START: Mark user as fetched ---
      lastFetchedKey.current = publicKey.toBase58();
      // --- MODIFICATION END ---
    } catch (error) {
      console.error("Error fetching locks:", error);
    } finally {
      // --- MODIFICATION START: Always turn off loader ---
      setIsLoading(false);
      // --- MODIFICATION END ---
    }
  }, [publicKey, connection]);

  // --- MODIFICATION START: Added useEffect to manage fetching ---
  // This effect ensures data is fetched when the user connects their wallet
  // or when they navigate to the locker page.
  useEffect(() => {
    if (publicKey) {
      fetchUserLocks();
    } else {
      // If the user disconnects, clear the state.
      setLocks([]);
      lastFetchedKey.current = null;
    }
  }, [publicKey, fetchUserLocks]);
  // --- MODIFICATION END ---

  // --- CREATE LOCK ---
  const createLock = async (
    mintAddress: string,
    amount: string,
    duration: string,
    timeUnit: "minutes" | "hours" | "days" | "years",
    decimals: number,
    tokenProgramIdString: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsProcessing(true);

    try {
      const durVal = parseFloat(duration);
      let multiplier = 1000 * 60;
      if (timeUnit === "hours") multiplier = 1000 * 60 * 60;
      if (timeUnit === "days") multiplier = 1000 * 60 * 60 * 24;
      if (timeUnit === "years") multiplier = 1000 * 60 * 60 * 24 * 365;

      const unlockDate = new Date(Date.now() + durVal * multiplier);
      const unlockTimestamp = new BN(Math.floor(unlockDate.getTime() / 1000));

      const mint = new PublicKey(mintAddress);
      const tokenProgramId = new PublicKey(tokenProgramIdString);
      const lockIdBN = new BN(Date.now());
      const amountBN = new BN(Math.floor(parseFloat(amount) * 10 ** decimals));

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
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgramId
      );

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
          tokenProgram: tokenProgramId,
          rent: SYSVAR_RENT_PUBKEY,
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

      let tx: string;
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 5,
        });
      } else {
        tx = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      await connection.confirmTransaction(
        { signature: tx, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      refreshHistory(true);
      // This will now be a background refresh
      setTimeout(() => fetchUserLocks(), 2000);
      return tx;
    } catch (error: any) {
      // FIX: Improved error logging to see the "Object" details
      console.error("Lock Creation Error (Raw):", error);
      console.error(
        "Lock Creation Error (String):",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      if (error.logs) console.error("Tx Logs:", error.logs);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // --- WITHDRAW TOKENS ---
  const withdrawTokens = async (
    lock: LockRecord,
    amountUi: number, // FIX: Added Amount argument
    transferToAddress?: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsProcessing(true);
    try {
      const lockIdBN = new BN(lock.lockId);
      const amountBN = new BN(Math.floor(amountUi * 10 ** lock.decimals)); // Convert UI amount to BN
      const mint = new PublicKey(lock.tokenMint);

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

      const mintInfo = await connection.getAccountInfo(mint);
      const tokenProgramId = mintInfo ? mintInfo.owner : TOKEN_PROGRAM_ID;

      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgramId
      );

      // 1. Withdraw Instruction (Vault -> Owner)
      const instructions = [];
      const withdrawIx = await program.methods
        .proxyWithdrawTokens(lockIdBN, amountBN) // FIX: Pass amountBN here
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

      instructions.push(withdrawIx);

      // 2. Optional: Transfer Instruction (Owner -> Recipient)
      if (transferToAddress) {
        const recipient = new PublicKey(transferToAddress);
        const recipientAta = getAssociatedTokenAddressSync(
          mint,
          recipient,
          false,
          tokenProgramId
        );

        // Check if recipient ATA exists, create if not
        const recipientInfo = await connection.getAccountInfo(recipientAta);
        if (!recipientInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientAta,
              recipient,
              mint,
              tokenProgramId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // Add transfer
        instructions.push(
          createTransferInstruction(
            userTokenAccount,
            recipientAta,
            publicKey,
            BigInt(amountBN.toString()), // Transfer same amount withdrawn
            [],
            tokenProgramId
          )
        );
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      let tx: string;
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 5,
        });
      } else {
        tx = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      await connection.confirmTransaction(
        { signature: tx, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      refreshHistory(true);
      // This will now be a background refresh
      await fetchUserLocks();
      return tx;
    } catch (error: any) {
      console.error(
        "Withdraw Error:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      if (error.logs) console.error("Logs:", error.logs);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // --- CLOSE VAULT ---
  const closeVault = async (lock: LockRecord) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsProcessing(true);
    try {
      const lockIdBN = new BN(lock.lockId);
      const mint = new PublicKey(lock.tokenMint);
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

      const mintInfo = await connection.getAccountInfo(mint);
      const tokenProgramId = mintInfo ? mintInfo.owner : TOKEN_PROGRAM_ID;

      const instruction = await program.methods
        .proxyCloseVault(lockIdBN)
        .accountsPartial({
          owner: publicKey,
          lockRecord,
          vault,
          tokenMint: mint,
          tokenProgram: tokenProgramId,
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

      let tx;
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
        });
      } else {
        tx = await sendTransaction(transaction, connection, {
          skipPreflight: true,
        });
      }

      await connection.confirmTransaction(
        { signature: tx, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      refreshHistory(true);
      // This will now be a background refresh
      await fetchUserLocks();
      return tx;
    } catch (e: any) {
      // FIX: Improved error logging
      console.error("Close Vault Error (Raw):", e);
      console.error(
        "Close Vault Error (String):",
        JSON.stringify(e, Object.getOwnPropertyNames(e))
      );
      if (e.logs) console.error("Logs:", e.logs);
      throw e;
    } finally {
      setIsProcessing(false);
    }
  };

  const getWalletBalance = async (
    mintAddress: string,
    programIdString: string
  ) => {
    if (!publicKey) return 0;
    try {
      const progId = new PublicKey(programIdString);
      const ata = getAssociatedTokenAddressSync(
        new PublicKey(mintAddress),
        publicKey,
        false,
        progId
      );
      const info = await connection.getTokenAccountBalance(ata);
      return info.value.uiAmount || 0;
    } catch (e) {
      return 0;
    }
  };

  return {
    locks,
    fetchUserLocks,
    createLock,
    withdrawTokens,
    closeVault,
    getWalletBalance,
    isLoading,
    isProcessing,
  };
}

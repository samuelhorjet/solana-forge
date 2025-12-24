// FILE: hooks/useTokenActions.ts

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider"; // Get the Anchor Program
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useHistory } from "@/components/history-provider";

// Helper for IPFS (Keep as is)
const uploadToIpfs = async (
  file: File | Blob,
  isJson = false
): Promise<string> => {
  const data = new FormData();
  data.append("file", file, isJson ? "metadata.json" : undefined);
  const res = await fetch("/api/upload", { method: "POST", body: data });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()).url;
};

export function useTokenActions() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { program } = useProgram(); // Access Anchor Program
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshHistory } = useHistory();

  // --- PROXY TRANSFER ---
  const transferToken = useCallback(
    async (
      mintAddress: string,
      destinationAddress: string,
      amount: number,
      decimals: number,
      programId: string
    ) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");
      setIsProcessing(true);
      try {
        const mint = new PublicKey(mintAddress);
        const dest = new PublicKey(destinationAddress);
        const tokenProgram = new PublicKey(programId);

        const amountBN = new BN(Math.floor(amount * 10 ** decimals));

        const fromAta = getAssociatedTokenAddressSync(
          mint,
          publicKey,
          false,
          tokenProgram
        );
        const toAta = getAssociatedTokenAddressSync(
          mint,
          dest,
          false,
          tokenProgram
        );

        // We still need to create the ATA instruction if it doesn't exist,
        // but the transfer itself goes through the proxy.
        // For simplicity in this proxy example, we assume ATA creation is handled or bundled.
        // Ideally, your smart contract handles ATA creation or you bundle it here.
        // Here we bundle standard ATA creation + Proxy Transfer.

        const instructions = [];

        // Check/Create Dest ATA
        const destInfo = await connection.getAccountInfo(toAta);
        if (!destInfo) {
          // We must use standard SPL instruction for ATA creation (not proxied usually)
          // or create a proxy_create_ata instruction. Standard is fine.
          const { createAssociatedTokenAccountInstruction } = await import(
            "@solana/spl-token"
          );
          instructions.push(
            createAssociatedTokenAccountInstruction(
              publicKey,
              toAta,
              dest,
              mint,
              tokenProgram,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // Call Proxy Transfer
        const proxyIx = await program.methods
          .proxyTransfer(amountBN)
          .accountsPartial({
            authority: publicKey,
            from: fromAta,
            to: toAta,
            mint: mint,
            tokenProgram: tokenProgram,
          })
          .instruction();

        instructions.push(proxyIx);

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        let signature: string;
        if (signTransaction) {
          const signedTx = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: true, maxRetries: 5 }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            maxRetries: 5,
          });
          
        }
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        refreshHistory(true);
        return signature;
        
      } catch (error) {
        console.error("Transfer failed", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [connection, publicKey, program, sendTransaction, signTransaction]
  );

  // --- PROXY MINT TO ---
  const mintMoreToken = useCallback(
    async (
      mintAddress: string,
      amount: number,
      decimals: number,
      programId: string
    ) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");
      setIsProcessing(true);
      try {
        const mint = new PublicKey(mintAddress);
        const tokenProgram = new PublicKey(programId);
        const amountBN = new BN(Math.floor(amount * 10 ** decimals));

        const userATA = getAssociatedTokenAddressSync(
          mint,
          publicKey,
          false,
          tokenProgram
        );

        const instruction = await program.methods
          .proxyMintTo(amountBN)
          .accountsPartial({
            authority: publicKey,
            mint: mint,
            to: userATA,
            tokenProgram: tokenProgram,
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
          signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: true, maxRetries: 5 }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            maxRetries: 5,
          });
        }
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        refreshHistory(true);
        return signature;
      } catch (error) {
        console.error("Minting failed", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [connection, publicKey, program, sendTransaction, signTransaction]
  );

  // --- UPDATE METADATA (PROXY) ---
  const updateTokenMetadata = useCallback(
    async (
      mintAddress: string,
      currentData: {
        name: string;
        symbol: string;
        description: string;
        image: string;
        website?: string;
        twitter?: string;
        telegram?: string;
      },
      newImageFile: File | null
    ) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");
      setIsProcessing(true);

      try {
        const mint = new PublicKey(mintAddress);

        // 1. Handle Image
        let imageUrl = currentData.image;
        if (newImageFile) {
          imageUrl = await uploadToIpfs(newImageFile);
        }

        // 2. JSON Upload
        const metadataPayload: any = {
          name: currentData.name,
          symbol: currentData.symbol,
          description: currentData.description,
          image: imageUrl,
          external_url: currentData.website || "",
          attributes: [],
        };

        if (currentData.twitter)
          metadataPayload.attributes.push({
            trait_type: "Twitter",
            value: currentData.twitter,
          });
        if (currentData.telegram)
          metadataPayload.attributes.push({
            trait_type: "Telegram",
            value: currentData.telegram,
          });

        const metaUrl = await uploadToIpfs(
          new Blob([JSON.stringify(metadataPayload)], {
            type: "application/json",
          }),
          true
        );

        // 3. Call Program Instruction
        const instruction = await program.methods
          .updateTokenMetadata(currentData.name, currentData.symbol, metaUrl)
          .accountsPartial({
            authority: publicKey,
            metadata: mint, // For Token2022, Mint IS Metadata
            tokenProgram: TOKEN_2022_PROGRAM_ID,
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
          signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: true, maxRetries: 5 }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            maxRetries: 5,
          });
        }
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        refreshHistory(true);
        return signature;
      } catch (error: any) {
        console.error("Update Metadata Failed:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [connection, publicKey, program, sendTransaction, signTransaction]
  );

  return { transferToken, mintMoreToken, updateTokenMetadata, isProcessing };
}

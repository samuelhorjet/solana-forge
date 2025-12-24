// FILE: hooks/useWalletHoldings.ts

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { fetchTokenMetadata } from "@/hooks/useTokenMetadata";
import { Token, TokenExtensions } from "@/types/token";

export function useWalletHoldings() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [holdings, setHoldings] = useState<Token[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      // 1. Fetch SOL Balance
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);

      // 2. Fetch All Token Accounts
      const [legacyAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const allTokenAccounts = [
        ...legacyAccounts.value,
        ...token2022Accounts.value,
      ];

      // 3. Initial Filter
      const activeAccounts = allTokenAccounts.filter((t) => {
        return t.account.data.parsed.info.tokenAmount.uiAmount > 0;
      });

      if (activeAccounts.length === 0) {
        setHoldings([]);
        setIsLoading(false);
        return;
      }

      // 4. Batch Fetch Mint Info
      const mintAddresses = activeAccounts.map(
        (t) => new PublicKey(t.account.data.parsed.info.mint)
      );

      const mintInfos = await connection.getMultipleAccountsInfo(mintAddresses);

      // 5. Map Data
      const holdingsPromises = activeAccounts.map(async (t, index) => {
        const info = t.account.data.parsed.info;
        const mint = info.mint;
        const ownerProgram = t.account.owner;
        const decimals = info.tokenAmount.decimals;

        const mintAccountInfo = mintInfos[index];
        let isMintable = false;
        let mintAuthority = "";
        let supply = 0;

        // --- PARSE EXTENSIONS ---
        const extensions: TokenExtensions = {};

        if (mintAccountInfo) {
          try {
            // 1. Standard Unpack
            const mintData = unpackMint(
              new PublicKey(mint),
              mintAccountInfo,
              mintAccountInfo.owner
            );

            supply = Number(mintData.supply) / 10 ** decimals;

            // Filter out NFTs
            if (decimals === 0 && Number(mintData.supply) === 1) {
              return null;
            }

            if (mintData.mintAuthority) {
              mintAuthority = mintData.mintAuthority.toBase58();
              if (mintData.mintAuthority.equals(publicKey)) {
                isMintable = true;
              }
            }

            // 2. Parse Extensions (from raw TLV or via RPC parsed data fallback)
            // Note: Since we fetched Raw Mint Account, we would ideally parse TLV.
            // However, getParsedTokenAccountsByOwner often gives us the Mint *Account* extensions
            // if we queried the mint. But here we are iterating accounts.
            // We rely on manual check or if we had used getParsedAccountInfo for mints.

            // Simulating Parse based on Program Owner (Token 2022)
            if (
              mintAccountInfo.owner.toBase58() ===
              TOKEN_2022_PROGRAM_ID.toBase58()
            ) {
              // We need to re-fetch Parsed Mint Info to get nice JSON extensions easily
              // or decode raw TLV. For performance, we will do a targeted fetch if needed
              // OR assumes basics.
              // BETTER STRATEGY: Use the helper below to decoding raw buffer if possible
              // For this example, let's assume we do a quick parsed fetch for 2022 tokens
              // to get accurate extension data, as raw buffer parsing is complex without headers.
            }
          } catch (e) {
            console.warn("Failed to unpack mint for", mint);
          }
        }

        // --- FETCH EXTENSION DATA (Reliable Method) ---
        if (ownerProgram.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()) {
          try {
            // We fetch the PARSED mint account to get easy-to-read extensions
            const parsedMint = await connection.getParsedAccountInfo(
              new PublicKey(mint)
            );
            if (parsedMint.value && "parsed" in parsedMint.value.data) {
              const info = parsedMint.value.data.parsed.info;
              const extList = info.extensions || [];

              // 1. Transfer Fee
              const feeConfig = extList.find(
                (e: any) => e.extension === "transferFeeConfig"
              );
              if (feeConfig) {
                const feeRate =
                  feeConfig.state.newerTransferFee.transferFeeBasisPoints / 100;
                extensions.transferFee = `${feeRate}%`;
              }

              // 2. Non Transferable
              const nonTrans = extList.find(
                (e: any) => e.extension === "nonTransferable"
              );
              if (nonTrans) {
                extensions.nonTransferable = true;
              }

              // 3. Permanent Delegate
              const permDel = extList.find(
                (e: any) => e.extension === "permanentDelegate"
              );
              if (permDel) {
                extensions.permanentDelegate = permDel.state.delegate;
              }

              // 4. Transfer Hook
              const transHook = extList.find(
                (e: any) => e.extension === "transferHook"
              );
              if (transHook) {
                extensions.transferHook = transHook.state.programId;
              }

              // 5. Interest Bearing
              const interest = extList.find(
                (e: any) => e.extension === "interestBearingConfig"
              );
              if (interest) {
                extensions.interestRate = interest.state.currentRate;
              }
            }
          } catch (e) {
            console.error("Error parsing extensions", e);
          }
        }

        // Metadata Fetching
        const meta = await fetchTokenMetadata(connection, mint);

        let imageUrl = "";
        let description = "";
        let website = "";
        let twitter = "";
        let telegram = "";

        if (meta.uri) {
          try {
            const cleanUri = meta.uri.replace(/\0/g, "").trim();
            if (cleanUri) {
              const response = await fetch(cleanUri);
              if (response.ok) {
                const json = await response.json();
                imageUrl = json.image || "";
                description = json.description || "";
                website = json.external_url || "";
                if (Array.isArray(json.attributes)) {
                  const twitAttr = json.attributes.find(
                    (a: any) => a.trait_type === "Twitter"
                  );
                  if (twitAttr) twitter = twitAttr.value;
                  const teleAttr = json.attributes.find(
                    (a: any) => a.trait_type === "Telegram"
                  );
                  if (teleAttr) telegram = teleAttr.value;
                }
              }
            }
          } catch (e) {
            // silent fail
          }
        }

        return {
          id: t.pubkey.toBase58(),
          name: meta.name || "Unknown",
          symbol: meta.symbol || "UNK",
          supply: supply,
          balance: info.tokenAmount.uiAmount,
          decimals: decimals,
          mintAddress: mint,
          createdAt: new Date().toISOString(),
          status: "active",
          programId: ownerProgram.toBase58(),
          image: imageUrl,
          isMintable: isMintable,
          authority: mintAuthority,
          description,
          website,
          twitter,
          telegram,
          extensions, // <--- Added here
        } as Token;
      });

      const resolvedHoldings = await Promise.all(holdingsPromises);
      const cleanedHoldings = resolvedHoldings.filter(
        (t): t is Token => t !== null
      );

      setHoldings(cleanedHoldings);
    } catch (error) {
      console.error("Error loading holdings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  return { holdings, balance, isLoading, refreshHoldings: fetchHoldings };
}

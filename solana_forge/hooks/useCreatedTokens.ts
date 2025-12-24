// FILE: hooks/useCreatedTokens.ts

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
  getTokenMetadata,
} from "@solana/spl-token";
import { Token } from "@/types/token";
import { useHistory } from "@/components/history-provider"; // <--- IMPORT HISTORY

// Standard Metaplex Program ID
const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export function useCreatedTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { history, isLoading: isHistoryLoading } = useHistory(); // <--- CONSUME HISTORY
  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Optimistic add for immediate UI feedback
  const addToken = (token: Token) => {
    setCreatedTokens((prev) => {
      if (prev.some((t) => t.mintAddress === token.mintAddress)) return prev;
      return [token, ...prev];
    });
  };

  const fetchCreatedTokens = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      // ---------------------------------------------------------
      // 1. SOURCE A: Get Mints from Wallet (Current Holdings)
      // ---------------------------------------------------------
      const [legacyAccounts, token22Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const walletMints = new Set<string>();
      const balanceMap = new Map<string, number>();

      [...legacyAccounts.value, ...token22Accounts.value].forEach((t) => {
        const info = t.account.data.parsed.info;
        walletMints.add(info.mint);
        balanceMap.set(info.mint, info.tokenAmount.uiAmount || 0);
      });

      // ---------------------------------------------------------
      // 2. SOURCE B: Get Mints from History (Permanent Record)
      // ---------------------------------------------------------
      // This ensures tokens show up even if you have 0 balance
      const historyMints = new Set<string>();
      if (history && history.length > 0) {
        history.forEach((item) => {
          if (item.type === "Created" && item.mint) {
            historyMints.add(item.mint);
          }
        });
      }

      // ---------------------------------------------------------
      // 3. MERGE SOURCES
      // ---------------------------------------------------------
      const allMintAddresses = Array.from(
        new Set([...walletMints, ...historyMints])
      );

      if (allMintAddresses.length === 0) {
        setCreatedTokens([]);
        setIsLoading(false);
        return;
      }

      // ---------------------------------------------------------
      // 4. BATCH FETCH MINT DATA
      // ---------------------------------------------------------
      const mintPubkeys = allMintAddresses.map((m) => new PublicKey(m));
      const mintInfos = await connection.getMultipleAccountsInfo(mintPubkeys);

      const myCreatedTokensData: any[] = [];

      for (let i = 0; i < mintPubkeys.length; i++) {
        const mintPubkey = mintPubkeys[i];
        const mintAddress = mintPubkey.toBase58();
        const mintAccount = mintInfos[i];

        // If mint account is null, it might have been closed/invalid
        if (!mintAccount) continue;

        let mintData = null;
        let isMintAuth = false;

        // A. Unpack Mint Data to check Authority
        try {
          mintData = unpackMint(mintPubkey, mintAccount, mintAccount.owner);

          // Check if user is the Mint Authority
          if (mintData.mintAuthority?.equals(publicKey)) {
            isMintAuth = true;
          }
        } catch (e) {
          // Not a valid mint or parsing failed
          continue;
        }

        // B. METADATA STRATEGY
        let name = "Unknown";
        let symbol = "UNK";
        let uri = "";
        let isUpdateAuth = false;

        // B1. Check Token-2022 Native Metadata
        if (mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
          try {
            const nativeMeta = await getTokenMetadata(connection, mintPubkey);
            if (nativeMeta) {
              name = nativeMeta.name;
              symbol = nativeMeta.symbol;
              uri = nativeMeta.uri;
              if (nativeMeta.updateAuthority?.equals(publicKey)) {
                isUpdateAuth = true;
              }
            }
          } catch (e) {
            /* ignore */
          }
        }

        // B2. Check Metaplex Metadata (Legacy or 2022 Hybrid)
        // Only check if we didn't find native metadata or need to verify update auth
        if (name === "Unknown" || !isUpdateAuth) {
          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              METAPLEX_PROGRAM_ID.toBuffer(),
              mintPubkey.toBuffer(),
            ],
            METAPLEX_PROGRAM_ID
          );

          // We can't batch these easily without huge arrays, doing single fetch for now
          // (In prod, you'd batch these too)
          const metaAccountInfo = await connection.getAccountInfo(pda);

          if (metaAccountInfo) {
            const metaData = unpackMetadata(metaAccountInfo.data);
            if (metaData) {
              if (name === "Unknown") {
                name = metaData.name;
                symbol = metaData.symbol;
                uri = metaData.uri;
              }
              if (metaData.updateAuthority === publicKey.toBase58()) {
                isUpdateAuth = true;
              }
            }
          }
        }

        // ---------------------------------------------------------
        // 5. FILTER: IS THIS "MY" TOKEN?
        // ---------------------------------------------------------
        // We include it IF:
        // 1. We found it in History as "Created" (Permanent Record)
        // 2. OR We are the Mint Authority
        // 3. OR We are the Update Authority
        const isInHistory = historyMints.has(mintAddress);

        if (isInHistory || isMintAuth || isUpdateAuth) {
          myCreatedTokensData.push({
            mintAddress,
            mintData,
            name,
            symbol,
            uri,
            isMintable: isMintAuth, // Only strictly mintable if we hold mint auth
            programId: mintAccount.owner.toBase58(),
            authority: mintData.mintAuthority
              ? mintData.mintAuthority.toBase58()
              : "Revoked",
          });
        }
      }

      // 6. Hydrate JSON (Images/Socials)
      const finalTokens: Token[] = await Promise.all(
        myCreatedTokensData.map(async (item) => {
          let imageUrl = "";
          let description = "";
          let website = "";
          let twitter = "";
          let telegram = "";

          const cleanUri = item.uri ? item.uri.replace(/\0/g, "").trim() : "";

          if (cleanUri) {
            try {
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
            } catch (e) {
              // Ignore fetch errors
            }
          }

          const decimals = item.mintData?.decimals || 9;
          const supply = item.mintData
            ? Number(item.mintData.supply) / 10 ** decimals
            : 0;

          return {
            id: item.mintAddress,
            mintAddress: item.mintAddress,
            name: item.name,
            symbol: item.symbol,
            decimals: decimals,
            supply: supply,
            balance: balanceMap.get(item.mintAddress) || 0, // 0 if not in wallet
            image: imageUrl,
            isMintable: item.isMintable,
            programId: item.programId,
            status: "active",
            authority: item.authority,
            description,
            website,
            twitter,
            telegram,
          };
        })
      );

      setCreatedTokens(finalTokens);
    } catch (error) {
      console.error("Error fetching created tokens:", error);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, history]); // <--- Re-run when history loads

  // Initial fetch
  useEffect(() => {
    fetchCreatedTokens();
  }, [fetchCreatedTokens]);

  return {
    createdTokens,
    isLoadingCreated: isLoading || isHistoryLoading,
    refreshCreatedTokens: fetchCreatedTokens,
    addToken,
  };
}

// === HELPER (Metaplex Unpack) ===
function unpackMetadata(data: Buffer) {
  try {
    if (data[0] !== 4) return null;
    const updateAuthority = new PublicKey(data.subarray(1, 33)).toBase58();
    let offset = 65;

    const readString = () => {
      if (offset + 4 > data.length) return "";
      const len = data.readUInt32LE(offset);
      offset += 4;
      if (offset + len > data.length) return "";
      const str = data.toString("utf8", offset, offset + len);
      offset += len;
      return str.replace(/\0/g, "");
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();

    return { name, symbol, uri, updateAuthority };
  } catch (e) {
    return null;
  }
}

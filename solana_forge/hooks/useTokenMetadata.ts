// FILE: hooks/useTokenMetadata.ts

import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenMetadata, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: [string, string][];
}

const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const fetchTokenMetadata = async (
  connection: Connection,
  mintAddress: string
): Promise<TokenMetadata> => {
  try {
    const mint = new PublicKey(mintAddress);

    // ---------------------------------------------------------
    // 1. STRATEGY A: Check Token-2022 Native Metadata first
    // ---------------------------------------------------------
    try {
      // We attempt to fetch the Mint account and parse extensions
      const nativeMetadata = await getTokenMetadata(
        connection,
        mint,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      if (nativeMetadata) {
        return {
          mint: mintAddress,
          name: nativeMetadata.name,
          symbol: nativeMetadata.symbol,
          uri: nativeMetadata.uri,
          // FIX: Convert readonly tuples to mutable tuples to match interface
          additionalMetadata: nativeMetadata.additionalMetadata.map(
            ([key, value]) => [key, value] as [string, string]
          ),
        };
      }
    } catch (e) {
      // Fails silently if not a Token-2022 mint or no extension found
      // Proceed to Strategy B
    }

    // ---------------------------------------------------------
    // 2. STRATEGY B: Fallback to Metaplex (Standard & Hybrid)
    // ---------------------------------------------------------
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METAPLEX_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataPDA);

    if (!accountInfo) {
      return { mint: mintAddress, name: "Unknown", symbol: "UNKN", uri: "" };
    }

    // Manually decode Metaplex Buffer
    const buffer = accountInfo.data;

    // Layout: key(1) | update_auth(32) | mint(32) | data_struct...
    // data_struct: name_len(4) | name | symbol_len(4) | symbol | uri_len(4) | uri ...
    let offset = 1 + 32 + 32;

    const readString = () => {
      if (offset >= buffer.length) return "";
      const len = buffer.readUInt32LE(offset);
      offset += 4;
      if (offset + len > buffer.length) return "";
      const str = buffer.toString("utf8", offset, offset + len);
      offset += len;
      return str.replace(/\0/g, "");
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();

    return {
      mint: mintAddress,
      name,
      symbol,
      uri,
    };
  } catch (error) {
    console.warn("Metadata fetch failed:", error);
    return {
      mint: mintAddress,
      name: "Unknown Token",
      symbol: "UNKN",
      uri: "",
    };
  }
};

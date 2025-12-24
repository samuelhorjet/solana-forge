// FILE: components/history-provider.tsx

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import { fetchTokenMetadata } from "@/hooks/useTokenMetadata";

// --- TYPES ---

export interface BatchDetail {
  mint: string;
  symbol: string;
  amount: number;
  image?: string;
  decimals: number;
}

export interface HistoryItem {
  signature: string;
  type: string;
  mint: string;
  amount?: number;
  timestamp: number;
  status: "Success" | "Failed";
  image?: string;
  symbol?: string;
  decimals?: number;
  lockId?: string;
  recipient?: string;
  name?: string;
  uri?: string;
  batchDetails?: BatchDetail[];
}

interface HistoryContextState {
  history: HistoryItem[];
  isLoading: boolean;
  loadingProgress: string;
  refreshHistory: (background?: boolean, force?: boolean) => Promise<void>;
  addHistoryItem: (item: HistoryItem) => void;
}

const HistoryContext = createContext<HistoryContextState>({
  history: [],
  isLoading: false,
  loadingProgress: "",
  refreshHistory: async () => {},
  addHistoryItem: () => {},
});

export const useHistory = () => useContext(HistoryContext);

const STORAGE_KEY_PREFIX = "solana_forge_history_v2";

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [storageKey, setStorageKey] = useState(STORAGE_KEY_PREFIX);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState("");
  const isFetched = useRef(false);

  // --- MODIFICATION START: Enhanced Local Storage and Wallet Change Logic ---
  useEffect(() => {
    // This effect manages the history state when the user's wallet connection changes.
    if (publicKey) {
      // 1. A wallet is connected. Create a unique storage key for this specific wallet.
      const newKey = `${STORAGE_KEY_PREFIX}_${publicKey.toBase58()}`;
      setStorageKey(newKey);

      // 2. Immediately load cached history from localStorage for the connected wallet.
      // This provides an instant view of past transactions on page load or wallet switch.
      const savedHistory =
        typeof window !== "undefined" ? localStorage.getItem(newKey) : null;
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);

      // 3. Reset fetch status to trigger a background refresh for any new transactions.
      isFetched.current = false;
      setIsLoading(true); // UI will show loading state until the background fetch completes.
    } else {
      // 4. No wallet is connected (user disconnected).
      // Clear history from the UI, but leave localStorage untouched.
      // This ensures that if they reconnect the same wallet, their history is preserved and loads instantly.
      setHistory([]);
      setStorageKey(STORAGE_KEY_PREFIX);
      setIsLoading(false);
    }
  }, [publicKey]);
  // --- MODIFICATION END ---

  // This effect automatically saves the history to localStorage whenever it changes.
  useEffect(() => {
    if (typeof window !== "undefined" && publicKey) {
      // Only save if a wallet is connected and we have a valid key.
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
  }, [history, storageKey, publicKey]);

  const addHistoryItem = useCallback((newItem: HistoryItem) => {
    setHistory((prev) => {
      if (
        prev.some(
          (item) =>
            item.signature === newItem.signature && item.type === newItem.type
        )
      ) {
        return prev;
      }
      return [newItem, ...prev];
    });
  }, []);

  const fetchHistoryData = useCallback(
    async (isBackground = false, force = false) => {
      if (!publicKey || !program) return;
      if (!isBackground) setIsLoading(true);
      setLoadingProgress("");

      if (force) {
        setHistory([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem(storageKey);
        }
      }

      try {
        const mostRecentSig =
          !force && history.length > 0 ? history[0].signature : undefined;
        const options: any = { limit: 100 };
        if (mostRecentSig) options.until = mostRecentSig;

        const signatures = await connection.getSignaturesForAddress(
          publicKey,
          options
        );

        if (signatures.length === 0) {
          if (force) setHistory([]);
          setIsLoading(false);
          return;
        }

        const eventParser = new anchor.EventParser(
          program.programId,
          program.coder
        );
        const parsedNewItems: HistoryItem[] = [];
        let processedCount = 0;

        for (const sigInfo of signatures) {
          processedCount++;
          setLoadingProgress(
            `Processing transaction ${processedCount}/${signatures.length}...`
          );

          if (!force && history.some((h) => h.signature === sigInfo.signature))
            continue;

          try {
            const tx = await connection.getParsedTransaction(
              sigInfo.signature,
              {
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
              }
            );

            if (!tx || !tx.meta) continue;

            const logs = tx.meta.logMessages || [];
            const status = tx.meta.err ? "Failed" : "Success";
            const events = [...eventParser.parseLogs(logs)];

            for (const event of events) {
              const data = event.data as any;
              const eventName = event.name.toLowerCase();

              let type = "Unknown";
              let mint = "";
              let rawAmount = "0";
              let lockId = undefined;
              let recipient = undefined;
              let batchDetails: BatchDetail[] = [];

              if (eventName.includes("batchburnevent")) {
                type = "Batch Burn";
                mint = "Multiple Assets";
                let totalBatchAmount = 0;

                for (let i = 0; i < data.mints.length; i++) {
                  const mPubkey = data.mints[i].toBase58();
                  const mAmountRaw = data.amounts[i].toString();
                  const meta = await fetchTokenMetadata(connection, mPubkey);
                  const bal = tx.meta.postTokenBalances?.find(
                    (b) => b.mint === mPubkey
                  );
                  const decimals = bal?.uiTokenAmount.decimals || 9;
                  const adjustedAmt =
                    parseFloat(mAmountRaw) / Math.pow(10, decimals);
                  let itemImage = "";
                  if (meta.uri) {
                    try {
                      const res = await fetch(meta.uri);
                      const json = await res.json();
                      itemImage = json.image || "";
                    } catch {}
                  }
                  batchDetails.push({
                    mint: mPubkey,
                    symbol: meta.symbol || "UNK",
                    amount: adjustedAmt,
                    image: itemImage,
                    decimals: decimals,
                  });
                  totalBatchAmount += adjustedAmt;
                }

                parsedNewItems.push({
                  signature: sigInfo.signature,
                  type,
                  mint,
                  amount: totalBatchAmount,
                  timestamp: (sigInfo.blockTime || 0) * 1000,
                  status,
                  symbol: "BATCH",
                  batchDetails,
                });
                continue;
              }

              if (
                eventName.includes("standardtokencreated") ||
                eventName.includes("token2022created")
              ) {
                type = "Created";
                mint = data.mint.toBase58();
                rawAmount = data.supply ? data.supply.toString() : "0";
              } else if (eventName.includes("walletburnevent")) {
                type = "Wallet Burn";
                mint = data.mint.toBase58();
                rawAmount = data.amount.toString();
              } else if (eventName.includes("lockedburnevent")) {
                type = "Vault Burn";
                mint = data.mint.toBase58();
                rawAmount = data.amount.toString();
              } else if (eventName.includes("tokenlocked")) {
                type = "Locked";
                mint = data.mint.toBase58();
                rawAmount = data.amount.toString();
                lockId = data.lockId.toString();
              } else if (eventName.includes("tokentransferred")) {
                type = "Transfer Out";
                mint = data.mint.toBase58();
                rawAmount = data.amount.toString();
                recipient = data.to.toBase58();
              } else if (eventName.includes("tokenminted")) {
                type = "Minted More";
                mint = data.mint.toBase58();
                rawAmount = data.amount.toString();
              } else if (eventName.includes("metadataupdated")) {
                type = "Metadata Update";
                mint = data.mint.toBase58();
              } else if (eventName.includes("tokenwithdrawn")) {
                type = "Withdrawn";
                mint = data.mint.toBase58();
                rawAmount = data.amount ? data.amount.toString() : "0";
                lockId = data.lockId.toString();
              } else if (eventName.includes("vaultclosed")) {
                type = "Vault Closed";
                mint = data.mint.toBase58();
                lockId = data.lockId.toString();
              }

              if (type !== "Unknown" && type !== "Batch Burn") {
                const meta = await fetchTokenMetadata(connection, mint);
                let decimals = 9;
                const bal = tx.meta.postTokenBalances?.find(
                  (b) => b.mint === mint
                );
                if (bal) decimals = bal.uiTokenAmount.decimals;

                const adjustedAmount =
                  type !== "Metadata Update" && type !== "Vault Closed"
                    ? parseFloat(rawAmount) / Math.pow(10, decimals)
                    : 0;

                let image = "";
                if (meta.uri) {
                  try {
                    const res = await fetch(meta.uri);
                    const json = await res.json();
                    image = json.image || "";
                  } catch {}
                }

                parsedNewItems.push({
                  signature: sigInfo.signature,
                  type,
                  mint,
                  amount: adjustedAmount,
                  timestamp: (sigInfo.blockTime || 0) * 1000,
                  status,
                  image,
                  symbol: meta.symbol || "UNK",
                  decimals: decimals,
                  name: meta.name || "Unknown",
                  uri: meta.uri,
                  lockId,
                  recipient,
                });
              }
            }
          } catch (e) {
            console.error("Error parsing tx:", sigInfo.signature, e);
          }
        }

        const groupedBySignature = new Map<string, HistoryItem[]>();
        for (const item of parsedNewItems) {
          if (!groupedBySignature.has(item.signature)) {
            groupedBySignature.set(item.signature, []);
          }
          groupedBySignature.get(item.signature)!.push(item);
        }

        const finalParsedItems: HistoryItem[] = [];
        for (const [signature, items] of groupedBySignature.entries()) {
          const walletBurns = items.filter(
            (item) => item.type === "Wallet Burn"
          );

          if (walletBurns.length > 1) {
            const totalBatchAmount = walletBurns.reduce(
              (sum, item) => sum + (item.amount || 0),
              0
            );
            const batchDetails: BatchDetail[] = walletBurns.map((burn) => ({
              mint: burn.mint,
              symbol: burn.symbol || "UNK",
              amount: burn.amount || 0,
              image: burn.image,
              decimals: burn.decimals || 0,
            }));

            finalParsedItems.push({
              signature: signature,
              type: "Batch Burn",
              mint: "Multiple Assets",
              amount: totalBatchAmount,
              timestamp: items[0].timestamp,
              status: items[0].status,
              symbol: "BATCH",
              batchDetails,
            });

            const otherEvents = items.filter(
              (item) => item.type !== "Wallet Burn"
            );
            finalParsedItems.push(...otherEvents);
          } else {
            finalParsedItems.push(...items);
          }
        }

        if (force) {
          setHistory(finalParsedItems);
        } else if (finalParsedItems.length > 0) {
          setHistory((prev) => {
            const merged = [...finalParsedItems, ...prev];
            return merged.filter(
              (item, index, self) =>
                index ===
                self.findIndex(
                  (t) =>
                    t.signature === item.signature &&
                    t.type === item.type &&
                    t.mint === item.mint
                )
            );
          });
        }
      } catch (e) {
        console.error("History fetch error:", e);
      } finally {
        setIsLoading(false);
        setLoadingProgress("");
      }
    },
    [connection, publicKey, program, history, storageKey]
  );

  useEffect(() => {
    if (!isFetched.current && publicKey && program) {
      isFetched.current = true;
      fetchHistoryData(true); // Fetch as a background task
    }
  }, [fetchHistoryData, publicKey, program]);

  return (
    <HistoryContext.Provider
      value={{
        history,
        isLoading,
        refreshHistory: fetchHistoryData,
        addHistoryItem,
        loadingProgress,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

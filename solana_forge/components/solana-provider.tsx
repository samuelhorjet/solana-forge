// FILE: components/solana-provider.tsx
"use client";

import { useMemo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export { useProgram, ProgramContext } from "./solana-context";
export type { ProgramContextState } from "./solana-context";

const ClientWalletProvider = dynamic(
  () => import("./ClientWalletProvider"),
  { ssr: false }
);  

export function SolanaProvider({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  
  const endpoint = useMemo(() => 
    process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network), 
  [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <ClientWalletProvider>{children}</ClientWalletProvider>
    </ConnectionProvider>
  );
}
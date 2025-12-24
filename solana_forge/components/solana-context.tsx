// FILE: components/solana-context.tsx
"use client";

import { createContext, useContext } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaForge } from "../idl/solana_forge";

export interface ProgramContextState {
  program: Program<SolanaForge> | null;
  provider: anchor.AnchorProvider | null;
  isInitialized: boolean | null;
  isNetworkCorrect: boolean | null;
  initializeUserAccount: () => Promise<void>;
}

export const ProgramContext = createContext<ProgramContextState>({
  program: null,
  provider: null,
  isInitialized: null,
  isNetworkCorrect: null,
  initializeUserAccount: async () => {},
});

export const useProgram = () => useContext(ProgramContext);
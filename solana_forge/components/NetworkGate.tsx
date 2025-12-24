// FILE: components/NetworkGate.tsx

"use client";

import { useProgram } from "@/components/solana-provider";
import { AlertTriangle, Loader2 } from "lucide-react";

export function NetworkGate({ children }: { children: React.ReactNode }) {
  const { isNetworkCorrect } = useProgram();

  // State 1: Still connecting wallet or checking network
  if (isNetworkCorrect === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Verifying Network Connection</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  // State 2: Network mismatch, block the UI
  if (isNetworkCorrect === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-lg border border-destructive bg-card p-8 text-center shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Wrong Network</h1>
            <p className="text-muted-foreground">
              Your wallet is currently connected to an unsupported network.
              <br />
              This application requires you to be on the{" "}
              <strong className="text-foreground">Devnet</strong> network.
            </p>
            <p className="pt-4 font-semibold text-foreground">
              {/* --- TEXT IMPROVEMENT --- */}
              Please switch the network in your wallet. The app will update automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Network is correct, show the app
  return <>{children}</>;
}
"use client";

import { useState } from "react";
import { useProgram } from "@/components/solana-provider";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export function InitializeGate({ children }: { children: React.ReactNode }) {
  const { isInitialized, initializeUserAccount } = useProgram();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This will now call the fixed function in solana-provider.tsx
      await initializeUserAccount();
    } catch (err: any) {
      console.error(err);
      // Clean up error message for UI
      let msg = err.message || "Initialization failed";
      if (msg.includes("User rejected")) msg = "Transaction rejected by wallet";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // State 1: Still checking the account (loading)
  if (isInitialized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Connecting to your Account</h2>
          <p className="text-muted-foreground">Checking on-chain status...</p>
        </div>
      </div>
    );
  }

  // State 2: Account does not exist, show Gate
  if (isInitialized === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-lg border bg-card p-8 text-center shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Account Setup</h1>
            <p className="text-muted-foreground">
              Welcome to SolanaForge. To begin, we need to create your secure profile on the blockchain.
            </p>
          </div>
          
          <Button 
            onClick={handleInitialize} 
            disabled={isLoading} 
            className="w-full text-lg h-12 btn-fintech" // Added btn-fintech class if you use it in globals.css
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Account"
            )}
          </Button>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm text-left">
              <AlertCircle className="h-4 w-4 shrink-0" /> 
              <span>{error}</span>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            This involves a small one-time transaction on Devnet.
          </p>
        </div>
      </div>
    );
  }
  
  // State 3: User is initialized, render the dashboard
  return <>{children}</>;
}
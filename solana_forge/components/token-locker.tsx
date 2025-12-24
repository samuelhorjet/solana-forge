// FILE: components/token-locker.tsx

"use client";

import { useState, useEffect } from "react";
import { Token } from "@/types/token";
// --- MODIFICATION START: Import LockRecord from the hook ---
import { LockRecord, useLocker } from "@/hooks/useLocker";
// --- MODIFICATION END ---
import { LockerList } from "./locker-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Timer,
  AlertTriangle,
  Coins,
  ChevronDown,
  Search,
  XCircle,
} from "lucide-react";

// --- MODIFICATION START: Update component props ---
interface TokenLockerProps {
  tokens: Token[];
  onNavigateToBurner?: (lockId: string, mint: string) => void;
  prefillMint?: string;
  // Add all state and functions from the useLocker hook
  locks: LockRecord[];
  isLoading: boolean;
  isProcessing: boolean;
  createLock: (...args: any[]) => Promise<any>;
  withdrawTokens: (...args: any[]) => Promise<any>;
  closeVault: (...args: any[]) => Promise<any>;
  getWalletBalance: (mint: string, progId: string) => Promise<number>;
  fetchUserLocks: () => void;
}
// --- MODIFICATION END ---

export function TokenLocker({
  tokens,
  onNavigateToBurner,
  prefillMint,
  // Destructure the new props
  locks,
  isLoading,
  isProcessing,
  createLock,
  withdrawTokens,
  closeVault,
  getWalletBalance,
  fetchUserLocks,
}: TokenLockerProps) {
  // --- MODIFICATION START: Remove the internal useLocker call ---
  // const {
  //   locks,
  //   fetchUserLocks,
  //   createLock,
  //   withdrawTokens,
  //   closeVault,
  //   getWalletBalance,
  //   isLoading,
  //   isProcessing,
  // } = useLocker();
  // --- MODIFICATION END ---

  const [view, setView] = useState<"list" | "create">("list");

  // Error State
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [realBalance, setRealBalance] = useState<number>(0);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Time State
  const [duration, setDuration] = useState<string>("");
  const [timeUnit, setTimeUnit] = useState<
    "minutes" | "hours" | "days" | "years"
  >("days");

  const selectedTokenData = tokens.find((t) => t.mintAddress === selectedToken);
  const isInsufficientBalance =
    amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > realBalance;

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mintAddress.includes(searchQuery)
  );
  
  // --- MODIFICATION START: Remove the useEffect that fetches locks ---
  // This is now handled by the parent component's hook.
  // useEffect(() => {
  //   fetchUserLocks();
  // }, [fetchUserLocks]);
  // --- MODIFICATION END ---

  useEffect(() => {
    if (prefillMint) {
      setView("create");
      setSelectedToken(prefillMint);
    }
  }, [prefillMint]);

  useEffect(() => {
    if (selectedToken) {
      const token = tokens.find((t) => t.mintAddress === selectedToken);
      if (token) {
        getWalletBalance(selectedToken, token.programId).then(setRealBalance);
      }
    }
  }, [selectedToken, tokens, getWalletBalance]);

  const handleCreateLock = async () => {
    if (!selectedToken || !amount || !duration || isInsufficientBalance) return;
    const token = tokens.find((t) => t.mintAddress === selectedToken);
    if (!token) return;

    setError(null); // Clear previous errors

    try {
      await createLock(
        selectedToken,
        amount,
        duration,
        timeUnit,
        token.decimals,
        token.programId
      );

      setView("list");
      setAmount("");
      setDuration("");
      setSelectedToken("");
    } catch (e: any) {
      console.error("Lock Creation Failed (UI Catch):", e);

      // Parse Error Message for UI
      let msg = e.message || "Unknown error occurred";
      if (e.logs) {
        // Try to find custom error codes in logs
        const logStr = e.logs.join(" ");
        if (logStr.includes("InstructionError")) {
          msg = "Transaction reverted. Check console logs for details.";
        }
      }
      setError(msg);
    }
  };

  const handleBurnNavigate = (lock: any) => {
    if (onNavigateToBurner) onNavigateToBurner(lock.lockId, lock.tokenMint);
  };

  if (view === "list") {
    return (
      <LockerList
        locks={locks}
        knownTokens={tokens}
        isLoading={isLoading}
        isProcessing={isProcessing}
        onWithdraw={withdrawTokens}
        onCloseVault={closeVault}
        onBurn={handleBurnNavigate}
        onCreateNew={() => setView("create")}
        onRefresh={fetchUserLocks}
      />
    );
  }

  return (
    <Card className="max-w-xl mx-auto animate-slide-up border-primary/20 shadow-2xl">
      <CardHeader className="bg-muted/30 border-b pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setView("list");
              setError(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Back to List
          </span>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" /> Create New Lock
        </CardTitle>
        <CardDescription>
          Lock tokens for a specific duration. You receive a Lock ID.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* ERROR ALERT */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Transaction Failed</AlertTitle>
            <AlertDescription className="text-xs break-all">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 1. ASSET SELECTOR */}
        <div className="space-y-3">
          <Label>Select Asset to Lock</Label>
          <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-16 justify-between px-4 border-2 hover:border-primary/50"
              >
                {selectedTokenData ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                      {selectedTokenData.image ? (
                        <img
                          src={selectedTokenData.image}
                          alt={selectedTokenData.symbol}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Coins className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-base leading-none">
                        {selectedTokenData.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedTokenData.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-base">
                    Choose Token...
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Token</DialogTitle>
              </DialogHeader>
              <div className="relative my-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or symbol..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-75 pr-4">
                <div className="space-y-1">
                  {filteredTokens.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tokens found
                    </div>
                  ) : (
                    filteredTokens.map((token) => (
                      <div
                        key={token.id}
                        onClick={() => {
                          setSelectedToken(token.mintAddress);
                          setIsSelectorOpen(false);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedToken === token.mintAddress
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                          {token.image ? (
                            <img
                              src={token.image}
                              alt={token.symbol}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold">{token.symbol}</span>
                            <span className="font-mono text-xs">
                              {token.balance}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-50">
                            {token.name}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {selectedToken && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Wallet Balance:</span>
              <span className="font-mono text-foreground font-bold">
                {realBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 2. AMOUNT INPUT */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Amount to Lock</Label>
            {isInsufficientBalance && (
              <span className="text-xs font-bold text-destructive flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" /> Insufficient Balance
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              className={`h-14 text-lg font-mono pl-4 pr-20 ${
                isInsufficientBalance
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              variant="ghost"
              className="absolute right-2 top-2.5 h-9 text-xs font-bold text-primary"
              onClick={() => setAmount(realBalance.toString())}
              disabled={!selectedToken}
            >
              MAX
            </Button>
          </div>
        </div>

        {/* 3. DURATION INPUT */}
        <div className="space-y-3">
          <Label>Lock Duration</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Duration"
              className="h-14 flex-1 text-lg"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Select value={timeUnit} onValueChange={(v: any) => setTimeUnit(v)}>
              <SelectTrigger className="h-14 w-35 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg text-xs flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Minimum duration is 1 minute.
          </div>
        </div>

        {/* 4. SUBMIT */}
        <Button
          className="w-full h-14 text-lg btn-fintech mt-4"
          onClick={handleCreateLock}
          disabled={
            isProcessing ||
            !selectedToken ||
            !amount ||
            !duration ||
            !!isInsufficientBalance
          }
        >
          {isProcessing ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <Lock className="mr-2 h-5 w-5" />
          )}
          Confirm Lock
        </Button>
      </CardContent>
    </Card>
  );
}
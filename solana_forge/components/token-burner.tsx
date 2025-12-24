// FILE: components/token-burner.tsx

"use client";

import { useState, useEffect } from "react";
import { Token } from "@/types/token";
import { useBurner, BurnQueueItem } from "@/hooks/useBurner";
import { useLocker } from "@/hooks/useLocker";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useCreatedTokens } from "@/hooks/useCreatedTokens";
import { useHistory } from "@/components/history-provider";
import { BurnerList } from "./burner-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Flame,
  Wallet,
  Lock,
  Layers,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Coins,
  ChevronDown,
  Search,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";

interface TokenBurnerProps {
  prefillLockId?: string;
  prefillMint?: string;
  onUpdate?: () => void;
}

type BurnMode = "single" | "batch" | "vault" | null;

export function TokenBurner({
  prefillLockId,
  prefillMint,
  onUpdate,
}: TokenBurnerProps) {
  const {
    holdings: walletTokens,
    isLoading: isLoadingHoldings,
    refreshHoldings,
  } = useWalletHoldings();
  const { refreshCreatedTokens } = useCreatedTokens();
  const {
    burnFromWallet,
    burnFromLock,
    burnBatch,
    burnHistory,
    calculateMaxBurnAmount,
    isLoading: isBurnerLoading, // Renamed to avoid conflict
  } = useBurner();
  const {
    locks,
    fetchUserLocks,
    isLoading: isLockerLoading, // Renamed to avoid conflict
  } = useLocker();
  const { addHistoryItem } = useHistory();

  const [view, setView] = useState<"history" | "form">("history");
  const [step, setStep] = useState<number>(1);
  const [mode, setMode] = useState<BurnMode>(null);

  // Single state
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Vault state
  const [selectedLockPubkey, setSelectedLockPubkey] = useState<string>("");
  const [lockBurnAmount, setLockBurnAmount] = useState<string>("");
  const [isVaultSelectorOpen, setIsVaultSelectorOpen] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");

  // BATCH STATE
  const [queue, setQueue] = useState<BurnQueueItem[]>([]);
  const [batchSelectedToken, setBatchSelectedToken] = useState<string>("");
  const [batchAmount, setBatchAmount] = useState<string>("");
  const [isBatchSelectorOpen, setIsBatchSelectorOpen] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillMint && !prefillLockId) {
      setView("form");
      setMode("single");
      setStep(2);
      setSelectedToken(prefillMint);
    } else if (prefillLockId) {
      setView("form");
      setMode("vault");
      setStep(2);
      // Find the corresponding lock pubkey for the prefilled lockId
      const lockToPrefill = locks.find((l) => l.lockId === prefillLockId);
      if (lockToPrefill) {
        setSelectedLockPubkey(lockToPrefill.pubkey);
      }
      fetchUserLocks();
    }
  }, [prefillLockId, prefillMint, fetchUserLocks, locks]);

  // Derived Data for UI
  const filteredTokens = walletTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mintAddress.includes(searchQuery)
  );

  const selectedTokenData = walletTokens.find(
    (t) => t.mintAddress === selectedToken
  );
  const isInsufficientBalance = selectedTokenData
    ? parseFloat(amount || "0") > selectedTokenData.balance
    : false;

  const batchTokenData = walletTokens.find(
    (t) => t.mintAddress === batchSelectedToken
  );
  const isBatchInsufficient = batchTokenData
    ? parseFloat(batchAmount || "0") > batchTokenData.balance
    : false;

  const isAlreadyInQueue = queue.some(
    (item) => item.mint === batchSelectedToken
  );

  // FIX: Show ALL locks with a balance, regardless of unlocked status.
  const burnableLocks = locks.filter((l) => l.amount > 0);
  const selectedLockData = locks.find((l) => l.pubkey === selectedLockPubkey);
  const isVaultInsufficient = selectedLockData
    ? parseFloat(lockBurnAmount || "0") > selectedLockData.amount
    : false;

  const filteredBurnableLocks = burnableLocks.filter(
    (l) =>
      l.tokenSymbol?.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      l.tokenName?.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      l.lockId.includes(vaultSearchQuery)
  );

  const triggerUpdates = () => {
    refreshHoldings();
    refreshCreatedTokens();
    if (onUpdate) onUpdate();
    setTimeout(() => {
      refreshHoldings();
      refreshCreatedTokens();
      if (onUpdate) onUpdate();
    }, 2000);
  };

  const handleMaxClick = (
    tokenData: Token | undefined,
    setFn: (v: string) => void
  ) => {
    if (!tokenData) return;
    const feeConfig = tokenData.extensions?.transferFee;
    const safeMax = calculateMaxBurnAmount(tokenData.balance, feeConfig);
    setFn(safeMax.toString());
  };

  const handleSingleBurn = async () => {
    if (isInsufficientBalance) return;
    const t = walletTokens.find((x) => x.mintAddress === selectedToken);
    if (!t) return;
    try {
      await burnFromWallet(
        selectedToken,
        parseFloat(amount),
        t.decimals,
        t.programId,
        t.symbol,
        t.image
      );
      triggerUpdates();
      resetAndClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVaultBurn = async () => {
    if (isVaultInsufficient || !selectedLockData) return;
    try {
      await burnFromLock(
        selectedLockData.tokenMint,
        selectedLockData.lockId,
        parseFloat(lockBurnAmount),
        selectedLockData.decimals,
        selectedLockData.programId,
        selectedLockData.tokenSymbol,
        selectedLockData.image
      );
      fetchUserLocks();
      triggerUpdates();
      resetAndClose();
    } catch (e) {
      console.error(e);
    }
  };

  const addToQueue = () => {
    if (!batchSelectedToken || !batchAmount || isBatchInsufficient) return;

    if (queue.some((item) => item.mint === batchSelectedToken)) {
      setDuplicateError("This token is already in the queue.");
      setTimeout(() => setDuplicateError(null), 3000);
      return;
    }

    const t = walletTokens.find((x) => x.mintAddress === batchSelectedToken);
    if (!t) return;

    setQueue((prev) => [
      ...prev,
      {
        mint: t.mintAddress,
        symbol: t.symbol,
        amount: batchAmount,
        decimals: t.decimals,
        balance: t.balance,
        programId: t.programId,
        image: t.image,
      },
    ]);
    setBatchSelectedToken("");
    setBatchAmount("");
    setDuplicateError(null);
  };

  const handleBatchExecute = async () => {
    if (queue.length === 0) return;
    try {
      await burnBatch(queue);
      triggerUpdates();
      resetAndClose();
    } catch (e) {
      console.error("Batch Burn Failed:", e);
    }
  };

  const resetAndClose = () => {
    setAmount("");
    setLockBurnAmount("");
    setQueue([]);
    setSelectedToken("");
    setSelectedLockPubkey("");
    setStep(1);
    setMode(null);
    setView("history");
    setDuplicateError(null);
    setSearchQuery("");
    setVaultSearchQuery("");
  };

  const renderAssetSelector = (
    value: string,
    onChange: (val: string) => void,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    dataSource: Token[] = filteredTokens
  ) => {
    const selectedData = walletTokens.find((t) => t.mintAddress === value);
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-16 justify-between px-4 border-2 hover:border-primary/50"
            disabled={isLoadingHoldings && dataSource.length === 0}
          >
            {selectedData ? (
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                  {selectedData.image ? (
                    <Image
                      src={selectedData.image}
                      alt={selectedData.symbol}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <Coins className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-bold text-base leading-none">
                    {selectedData.symbol}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedData.name}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-base">
                {isLoadingHoldings ? "Loading Assets..." : "Select Token..."}
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Asset</DialogTitle>
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
          <ScrollArea className="h-75">
            <div className="space-y-1">
              {dataSource.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isLoadingHoldings ? (
                    <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                  ) : (
                    "No tokens found"
                  )}
                </div>
              ) : (
                dataSource.map((token) => (
                  <div
                    key={token.id}
                    onClick={() => {
                      onChange(token.mintAddress);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      value === token.mintAddress
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                      {token.image ? (
                        <Image
                          src={token.image}
                          alt={token.symbol}
                          layout="fill"
                          objectFit="cover"
                        />
                      ) : (
                        <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold">{token.symbol}</span>
                        <span className="font-mono text-xs">
                          {token.balance.toLocaleString()}
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
    );
  };

  const renderStep1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
      <div
        onClick={() => {
          setMode("single");
          setStep(2);
        }}
        className="group cursor-pointer p-6 rounded-xl border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Wallet className="text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
        </div>
        <h3 className="font-bold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-400">
          Single Token
        </h3>
        <p className="text-xs text-muted-foreground group-hover:text-orange-600/80 dark:group-hover:text-orange-400/80">
          Burn one specific token from your wallet.
        </p>
      </div>
      <div
        onClick={() => {
          setMode("batch");
          setStep(2);
        }}
        className="group cursor-pointer p-6 rounded-xl border-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-red-100 dark:bg-red-900/40 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Layers className="text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
        </div>
        <h3 className="font-bold text-foreground group-hover:text-red-700 dark:group-hover:text-red-400">
          Batch Burn
        </h3>
        <p className="text-xs text-muted-foreground group-hover:text-red-600/80 dark:group-hover:text-red-400/80">
          Queue multiple tokens and burn them in one transaction.
        </p>
      </div>
      <div
        onClick={() => {
          setMode("vault");
          setStep(2);
          fetchUserLocks();
        }}
        className="group cursor-pointer p-6 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Lock className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
        </div>
        <h3 className="font-bold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400">
          From Vault
        </h3>
        <p className="text-xs text-muted-foreground group-hover:text-blue-600/80 dark:group-hover:text-blue-400/80">
          Burn tokens directly from your liquidity locks.
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (mode === "single") {
      const hasFee = selectedTokenData?.extensions?.transferFee;
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="space-y-3">
            <Label>Select Token</Label>
            {renderAssetSelector(
              selectedToken,
              setSelectedToken,
              isSelectorOpen,
              setIsSelectorOpen
            )}
            {selectedTokenData && (
              <div className="flex justify-between text-xs px-1">
                <span className="text-muted-foreground">
                  Available Balance:
                </span>
                <span className="font-mono font-bold">
                  {selectedTokenData.balance.toLocaleString()}
                </span>
              </div>
            )}
            {hasFee && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 text-yellow-600 rounded text-xs">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <b>Transfer Tax Detected ({hasFee}):</b> Max burn amount will
                  be automatically adjusted to cover the fee.
                </span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Amount to Burn</Label>
              {isInsufficientBalance && (
                <span className="text-xs font-bold text-destructive flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> Insufficient Balance
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`h-14 text-lg pr-16 font-mono ${
                  isInsufficientBalance
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                placeholder="0.00"
              />
              <Button
                variant="ghost"
                className="absolute right-2 top-2.5 text-xs font-bold text-orange-600"
                onClick={() => handleMaxClick(selectedTokenData, setAmount)}
                disabled={!selectedToken}
              >
                MAX
              </Button>
            </div>
          </div>
          <Button
            className="w-full h-14 bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-lg shadow-lg shadow-orange-500/20"
            disabled={
              !selectedToken ||
              !amount ||
              isBurnerLoading ||
              isInsufficientBalance
            }
            onClick={handleSingleBurn}
          >
            {isBurnerLoading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Flame className="mr-2 h-5 w-5" />
            )}{" "}
            INCINERATE
          </Button>
        </div>
      );
    }
    if (mode === "vault") {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3">
            <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full h-fit">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">
                Burning Locked Liquidity
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                You are burning tokens directly from a vault.
              </p>
            </div>
          </div>

          {/* IMPROVED LOCK SELECTOR MODAL */}
          <div className="space-y-3">
            <Label>Select Lock to Burn From</Label>
            <Dialog
              open={isVaultSelectorOpen}
              onOpenChange={setIsVaultSelectorOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-16 justify-between px-4 border-2 hover:border-primary/50"
                  disabled={isLockerLoading}
                >
                  {isLockerLoading ? (
                    <span className="text-muted-foreground text-base">
                      <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                      Loading Locks...
                    </span>
                  ) : selectedLockData ? (
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                        {selectedLockData.image ? (
                          <Image
                            src={selectedLockData.image}
                            alt={selectedLockData.tokenSymbol || "token"}
                            layout="fill"
                            objectFit="cover"
                          />
                        ) : (
                          <Coins className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-base leading-none">
                          {selectedLockData.tokenSymbol}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedLockData.tokenName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-base">
                      Select a Lock...
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Lock</DialogTitle>
                </DialogHeader>
                <div className="relative my-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by symbol or Lock ID..."
                    className="pl-8"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-75 pr-4">
                  <div className="space-y-1">
                    {filteredBurnableLocks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No burnable locks found.
                      </div>
                    ) : (
                      filteredBurnableLocks.map((lock) => (
                        <div
                          key={lock.pubkey}
                          onClick={() => {
                            setSelectedLockPubkey(lock.pubkey);
                            setIsVaultSelectorOpen(false);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedLockPubkey === lock.pubkey
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                            {lock.image ? (
                              <Image
                                src={lock.image}
                                alt={lock.tokenSymbol || "token"}
                                layout="fill"
                                objectFit="cover"
                              />
                            ) : (
                              <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-bold">
                                {lock.tokenSymbol}
                              </span>
                              <span className="font-mono text-xs font-bold">
                                {lock.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {lock.lockId}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Amount to Burn</Label>
              {selectedLockData && (
                <span
                  className={`text-xs ${
                    isVaultInsufficient
                      ? "text-destructive font-bold animate-pulse"
                      : "text-muted-foreground"
                  }`}
                >
                  Locked: {selectedLockData.amount.toLocaleString()}
                  {isVaultInsufficient && " (Insufficient)"}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                value={lockBurnAmount}
                onChange={(e) => setLockBurnAmount(e.target.value)}
                className={`h-12 font-mono ${
                  isVaultInsufficient
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                placeholder="0.00"
                disabled={!selectedLockData}
              />
              <Button
                variant="ghost"
                className="absolute right-2 top-1.5 text-xs font-bold text-blue-600"
                onClick={() => {
                  if (selectedLockData)
                    setLockBurnAmount(selectedLockData.amount.toString());
                }}
                disabled={!selectedLockData}
              >
                MAX
              </Button>
            </div>
          </div>
          <Button
            className="w-full h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
            disabled={
              !selectedLockData ||
              !lockBurnAmount ||
              isBurnerLoading ||
              isVaultInsufficient
            }
            onClick={handleVaultBurn}
          >
            {isBurnerLoading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Flame className="mr-2 h-4 w-4" />
            )}{" "}
            Burn from Vault
          </Button>
        </div>
      );
    }

    if (mode === "batch") {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
              <h3 className="font-bold flex items-center gap-2 text-sm uppercase text-muted-foreground">
                <Plus className="h-4 w-4" /> Staging Area
              </h3>
              <div className="space-y-3">
                <Label>Select Asset</Label>
                {renderAssetSelector(
                  batchSelectedToken,
                  setBatchSelectedToken,
                  isBatchSelectorOpen,
                  setIsBatchSelectorOpen
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Amount</Label>
                  {batchTokenData && (
                    <span
                      className={`text-xs ${
                        isBatchInsufficient
                          ? "text-destructive font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      Bal: {batchTokenData.balance.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(e.target.value)}
                    className={
                      isBatchInsufficient
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  <Button
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 text-xs font-bold text-primary"
                    onClick={() =>
                      handleMaxClick(batchTokenData, setBatchAmount)
                    }
                    disabled={!batchSelectedToken}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <Button
                onClick={addToQueue}
                className="w-full"
                disabled={
                  !batchSelectedToken ||
                  !batchAmount ||
                  isBatchInsufficient ||
                  isAlreadyInQueue
                }
                variant="secondary"
              >
                {isAlreadyInQueue ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Already in Queue
                  </>
                ) : (
                  "Add to Queue"
                )}
              </Button>

              {duplicateError && (
                <div className="p-2 bg-red-100 text-red-600 rounded text-xs text-center animate-fade-in">
                  {duplicateError}
                </div>
              )}
            </div>

            <div className="flex flex-col h-full min-h-75 border rounded-xl overflow-hidden bg-background">
              <div className="p-3 bg-muted border-b flex justify-between items-center">
                <span className="font-bold text-sm">Burn Queue</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {queue.length} Items
                </span>
              </div>
              <ScrollArea className="flex-1 p-0">
                {queue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-50">
                    <Layers className="h-10 w-10 mb-2" />
                    <p className="text-sm">Queue is empty.</p>
                    <p className="text-xs">Add tokens from the left.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {queue.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.symbol}
                                layout="fill"
                                objectFit="cover"
                              />
                            ) : (
                              <Coins className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">
                              {item.amount} {item.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-25">
                              {item.mint.slice(0, 4)}...{item.mint.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          onClick={() =>
                            setQueue((q) => q.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t bg-muted/10">
                <Button
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
                  disabled={queue.length === 0 || isBurnerLoading}
                  onClick={handleBatchExecute}
                >
                  {isBurnerLoading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Flame className="mr-2 h-4 w-4" />
                  )}
                  EXECUTE BATCH ({queue.length})
                </Button>
                <p className="text-[10px] text-center mt-2 text-muted-foreground">
                  Transactions are bundled for faster approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (view === "history") {
    return (
      <BurnerList
        history={burnHistory}
        onStartBurn={() => setView("form")}
        isLoading={false} // <-- 2. Pass the isLoading prop here
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-slide-up">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === 2) {
              setStep(1);
              setMode(null);
            } else setView("history");
          }}
          className="hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />{" "}
          {step === 1 ? "Back to History" : "Change Mode"}
        </Button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold flex items-center justify-center gap-2">
          <Flame className="text-orange-600 h-8 w-8" /> Token Incinerator
        </h2>
        <p className="text-muted-foreground">
          Permanently destroy assets from circulation.
        </p>
      </div>

      <Card className="card-fintech border-orange-200/20 shadow-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>
            {step === 1
              ? "Select Method"
              : mode === "single"
              ? "Single Burn"
              : mode === "batch"
              ? "Batch Burn"
              : "Burn from Vault"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 ? renderStep1() : renderStep2()}
        </CardContent>
      </Card>
    </div>
  );
}

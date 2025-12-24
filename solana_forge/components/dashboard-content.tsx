// FILE: components/dashboard-content.tsx

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenCreationForm } from "@/components/token-creation-form";
import { TransactionHistory } from "@/components/transaction-history";
import { SettingsPanel } from "@/components/settings-panel";
import { TokenList } from "./token-list";
import { TokenDetails } from "./token-details";
import { TokenLocker } from "@/components/token-locker";
import { TokenBurner } from "@/components/token-burner";
import { TokenActionModal } from "@/components/token-action-modal";
import {
  TrendingUp,
  Plus,
  Wallet,
  Coins,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Lock,
  Flame,
  ArrowUpRight,
  Activity,
  History,
  Send,
  Copy,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Token } from "@/types/token";
import { useCreatedTokens } from "@/hooks/useCreatedTokens";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useLocker } from "@/hooks/useLocker";
import { HistoryItem, useHistory } from "@/components/history-provider";
import { TransactionDetailModal } from "./transaction-detail-modal"; // Import the shared modal
import Image from "next/image";

// Helper to format date
const formatDate = (ts: number) => {
  if (!ts) return "Unknown Date";
  // Format to be more like the screenshot: e.g., 12/20/2025, 2:59:09 AM
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

interface DashboardContentProps {
  activeSection: string;
  walletAddress: string;
  onSectionChange: (section: string) => void;
}

export function DashboardContent({
  activeSection,
  walletAddress,
  onSectionChange,
}: DashboardContentProps) {
  // Hooks
  const {
    holdings,
    balance,
    isLoading: isLoadingHoldings,
    refreshHoldings,
  } = useWalletHoldings();
  const { createdTokens, isLoadingCreated, refreshCreatedTokens, addToken } =
    useCreatedTokens();
  const {
    locks,
    isLoading: isLoadingLocker,
    isProcessing: isProcessingLocker,
    createLock,
    withdrawTokens,
    closeVault,
    getWalletBalance,
    fetchUserLocks,
  } = useLocker();
  const { history, isLoading: isHistoryLoading } = useHistory();

  // State
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [navParams, setNavParams] = useState<{
    lockId?: string;
    mint?: string;
  }>({});

  // MODAL STATE
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [modalAction, setModalAction] = useState<"transfer" | "mint" | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for the shared transaction detail modal
  const [selectedTx, setSelectedTx] = useState<HistoryItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // DETAIL VIEW STATE
  const [selectedDetailToken, setSelectedDetailToken] = useState<Token | null>(
    null
  );

  // Sync Data
  const synchronizedTokens = useMemo(() => {
    return createdTokens.map((createdToken) => {
      const holding = holdings.find(
        (h) => h.mintAddress === createdToken.mintAddress
      );
      return {
        ...createdToken,
        balance: holding ? holding.balance : 0,
        image: createdToken.image || holding?.image || "",
        isMintable: holding ? holding.isMintable : createdToken.isMintable,
        extensions: holding?.extensions || createdToken.extensions,
      };
    });
  }, [createdTokens, holdings]);

  // Calculate Portfolio
  useEffect(() => {
    if (balance === null) return;
    const solValue = balance * 145;
    const tokensValue = holdings.reduce(
      (acc, token) => acc + token.balance * 0.5,
      0
    );
    setPortfolioValue(solValue + tokensValue);
  }, [balance, holdings]);

  // Handler to open the shared transaction modal
  const handleHistoryItemSelect = (tx: HistoryItem) => {
    setSelectedTx(tx);
    setIsHistoryModalOpen(true);
  };

  // Handlers
  const handleTokenCreated = (newToken: Token) => {
    setShowTokenForm(false);
    onSectionChange("tokens");
    addToken(newToken);
    setTimeout(() => {
      refreshCreatedTokens();
      refreshHoldings();
    }, 2000);
  };

  const handleGlobalRefresh = () => {
    refreshHoldings();
    refreshCreatedTokens();
    fetchUserLocks();
  };

  const handleTokenAction = (
    action:
      | "view"
      | "details"
      | "refresh"
      | "lock"
      | "burn"
      | "mint"
      | "transfer",
    token?: Token
  ) => {
    if (action === "refresh") {
      handleGlobalRefresh();
      return;
    }

    if (!token) return;

    if (action === "view") {
      window.open(
        `https://solscan.io/token/${token.mintAddress}?cluster=devnet`,
        "_blank"
      );
    } else if (action === "details") {
      setSelectedDetailToken(token);
    } else if (action === "lock") {
      setNavParams({ mint: token.mintAddress });
      onSectionChange("locker");
    } else if (action === "burn") {
      setNavParams({ mint: token.mintAddress });
      onSectionChange("burner");
    } else if (action === "mint") {
      if (!token.isMintable) return;
      setActiveToken(token);
      setModalAction("mint");
      setIsModalOpen(true);
    } else if (action === "transfer") {
      setActiveToken(token);
      setModalAction("transfer");
      setIsModalOpen(true);
    }
  };

  const handleNavigateToBurner = (lockId: string, mint: string) => {
    setNavParams({ lockId, mint });
    onSectionChange("burner");
  };

  const handleModalSuccess = () => {
    handleGlobalRefresh();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- RENDERERS ---

  const renderDashboardOverview = () => {
    if (selectedDetailToken) {
      return (
        <TokenDetails
          token={selectedDetailToken}
          onBack={() => setSelectedDetailToken(null)}
        />
      );
    }

    const recentHistory = history.slice(0, 10);

    return (
      <div className="space-y-6 animate-slide-up pb-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif">Dashboard Overview</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGlobalRefresh}
              disabled={isLoadingHoldings || isLoadingCreated}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoadingHoldings || isLoadingCreated ? "animate-spin" : ""
                }`}
              />
            </Button>
            <Button
              className="btn-fintech gap-2"
              onClick={() => onSectionChange("tokens")}
            >
              <Plus className="h-4 w-4" /> Create Token
            </Button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Wallet Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance !== null ? (
                  `${balance.toFixed(2)} SOL`
                ) : (
                  <Loader2 className="animate-spin" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Updated from wallet
              </p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {portfolioValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">Est. Value (Demo)</p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tokens Held</CardTitle>
              <Coins className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingHoldings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  holdings.length
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                In connected wallet
              </p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Created Tokens
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingCreated ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  createdTokens.length
                )}
              </div>
              <p className="text-xs text-muted-foreground">Minted by you</p>
            </CardContent>
          </Card>
        </div>

        {/* SPLIT VIEW - REDESIGNED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* LEFT COL: TOKENS IN WALLET */}
          <Card className="card-fintech h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-serif">Tokens in Wallet</CardTitle>
              <CardDescription>
                Assets currently held in your wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-75 pr-4">
                <div className="space-y-3">
                  {isLoadingHoldings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  ) : holdings.length > 0 ? (
                    holdings.map((token) => (
                      <div
                        key={token.id}
                        onClick={() => handleTokenAction("details", token)}
                        className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border hover:bg-muted/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-background border shrink-0">
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
                          <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors">
                              {token.name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{token.symbol}</span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(token.mintAddress);
                                }}
                              >
                                <Copy className="h-3 w-3 cursor-pointer hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 justify-end items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-mono font-bold">
                              {token.balance.toLocaleString()}
                            </p>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("details", token)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("transfer", token)
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" /> Transfer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("view", token)
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" /> View
                                  Explorer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("lock", token)
                                  }
                                >
                                  <Lock className="mr-2 h-4 w-4 text-blue-500" />{" "}
                                  Lock Liquidity
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("burn", token)
                                  }
                                >
                                  <Flame className="mr-2 h-4 w-4 text-orange-500" />{" "}
                                  Burn Tokens
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {token.isMintable ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTokenAction("mint", token)
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4 text-green-500" />{" "}
                                    Mint More
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Lock className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
                                    Mint (Fixed)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No tokens found in wallet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* RIGHT COL: RECENT ACTIVITY */}
          <Card className="card-fintech h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="pl-3">
                <CardTitle className="font-serif">Recent Activity</CardTitle>
                <CardDescription>
                  Latest transactions from your history.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => onSectionChange("history")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-5">
              <ScrollArea className="h-75">
                {isHistoryLoading && recentHistory.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : recentHistory.length > 0 ? (
                  <div className="divide-y">
                    {recentHistory.map((tx) => (
                      <div
                        key={tx.signature + tx.type}
                        onClick={() => handleHistoryItemSelect(tx)}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">
                              {tx.type}
                            </span>
                            <p className="font-mono font-medium text-sm text-right">
                              {tx.amount?.toLocaleString()}{" "}
                              {tx.symbol && tx.type !== "Batch Burn" && (
                                <span className="text-muted-foreground">
                                  {tx.symbol}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.timestamp)}
                            </p>
                            <p
                              className={`text-xs font-semibold ${
                                tx.status === "Success"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {tx.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <History className="h-8 w-8 mb-2 opacity-20" />
                    <p>No recent activity found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ROW 3: QUICK ACTIONS */}
        <Card className="card-fintech w-full">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("tokens")}
              >
                <div className="bg-primary/10 p-1.5 rounded mr-3">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Create New Token
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("locker")}
              >
                <div className="bg-blue-500/10 p-1.5 rounded mr-3">
                  <Lock className="h-4 w-4 text-blue-600" />
                </div>
                Lock Liquidity
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("burner")}
              >
                <div className="bg-orange-500/10 p-1.5 rounded mr-3">
                  <Flame className="h-4 w-4 text-orange-600" />
                </div>
                Burn Tokens
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() =>
                  window.open(
                    `https://solscan.io/account/${walletAddress}?cluster=devnet`,
                    "_blank"
                  )
                }
              >
                <div className="bg-muted p-1.5 rounded mr-3">
                  <ArrowUpRight className="h-4 w-4 text-foreground" />
                </div>
                View Wallet on Solscan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* REUSABLE TOKEN ACTION MODAL */}
        <TokenActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          token={activeToken}
          action={modalAction}
          onSuccess={handleModalSuccess}
        />

        {/* SHARED TRANSACTION DETAIL MODAL */}
        <TransactionDetailModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          transaction={selectedTx}
        />
      </div>
    );
  };

  const renderTokenManagement = () =>
    showTokenForm ? (
      <div className="space-y-6 animate-slide-up">
        <TokenCreationForm
          onTokenCreated={handleTokenCreated}
          onCancel={() => setShowTokenForm(false)}
        />
      </div>
    ) : (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif">Token Management</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGlobalRefresh}
              disabled={isLoadingCreated}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingCreated ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              className="btn-fintech gap-2"
              onClick={() => setShowTokenForm(true)}
            >
              <Plus className="h-4 w-4" /> Create Token
            </Button>
          </div>
        </div>
        <TokenList
          tokens={synchronizedTokens}
          isLoading={isLoadingCreated}
          onTokenAction={handleTokenAction}
        />
      </div>
    );

  switch (activeSection) {
    case "tokens":
      return renderTokenManagement();
    case "locker":
      return (
        <TokenLocker
          tokens={holdings}
          onNavigateToBurner={handleNavigateToBurner}
          prefillMint={navParams.mint}
          locks={locks}
          isLoading={isLoadingLocker}
          isProcessing={isProcessingLocker}
          createLock={createLock}
          withdrawTokens={withdrawTokens}
          closeVault={closeVault}
          getWalletBalance={getWalletBalance}
          fetchUserLocks={fetchUserLocks}
        />
      );
    case "burner":
      return (
        <TokenBurner
          prefillLockId={navParams.lockId}
          prefillMint={navParams.mint}
          onUpdate={handleGlobalRefresh}
        />
      );
    case "history":
      // The history page now handles its own modal logic
      return <TransactionHistory />;
    case "settings":
      return <SettingsPanel walletAddress={walletAddress} />;
    default:
      return renderDashboardOverview();
  }
}

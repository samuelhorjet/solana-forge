// FILE: components/locker-list.tsx

"use client";

import { useState, useEffect } from "react";
import { LockRecord } from "@/hooks/useLocker";
import { Token } from "@/types/token";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter, // <-- Import CardFooter
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "./ui/countdown-timer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Unlock,
  Flame,
  Copy,
  Loader2,
  Plus,
  Coins,
  Trash2,
  Send,
  AlertTriangle,
  History,
  UserCheck,
  Ban,
  ChevronLeft, // <-- For Pagination
  ChevronRight, // <-- For Pagination
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LockerListProps {
  locks: LockRecord[];
  knownTokens: Token[];
  isLoading: boolean;
  isProcessing: boolean;
  onWithdraw: (
    lock: LockRecord,
    amount: number,
    recipient?: string
  ) => Promise<string>;
  onCloseVault: (lock: LockRecord) => Promise<string>;
  onBurn: (lock: LockRecord) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

// --- Skeleton Loader Component (Updated with footer) ---
function LockerListSkeleton() {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif text-2xl">
            Liquidity Vaults
          </CardTitle>
          <CardDescription>Manage your locked assets</CardDescription>
        </div>
        <Button className="btn-fintech gap-2" disabled>
          <Plus className="h-4 w-4" /> New Lock
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-50 pl-8">Asset</TableHead>
                <TableHead className="text-center">Locked Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Lock ID</TableHead>
                <TableHead className="min-w-40 text-center">
                  Unlock Time / Withdraw
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center justify-start gap-3 pl-4">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12.5" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-25 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-28 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-24 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-8 w-28 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-8 w-24 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-4 pt-4 border-t">
        <Skeleton className="h-4 w-25" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function LockerList({
  locks,
  knownTokens,
  isLoading,
  isProcessing,
  onWithdraw,
  onCloseVault,
  onBurn,
  onCreateNew,
  onRefresh,
}: LockerListProps) {
  // Modal State
  const [selectedLock, setSelectedLock] = useState<LockRecord | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  // Validation State for Withdraw
  const [isAmountInvalid, setIsAmountInvalid] = useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Pagination Logic ---
  const totalPages = Math.ceil(locks.length / ITEMS_PER_PAGE);
  const paginatedLocks = locks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const saved = localStorage.getItem("solana_forge_contacts");
    if (saved) setSavedAddresses(JSON.parse(saved));
  }, []);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const getTokenImage = (lock: LockRecord) => {
    if (lock.image) return lock.image;
    const t = knownTokens.find((token) => token.mintAddress === lock.tokenMint);
    return t?.image || null;
  };

  const handleOpenWithdraw = (lock: LockRecord) => {
    setSelectedLock(lock);
    setWithdrawAmount(lock.amount.toString());
    setRecipient("");
    setIsAddressValid(true);
    setIsAmountInvalid(false);
    setIsWithdrawModalOpen(true);
  };

  const handleAmountChange = (val: string) => {
    setWithdrawAmount(val);
    if (!selectedLock) return;
    const amt = parseFloat(val);
    if (!isNaN(amt) && amt > selectedLock.amount) {
      setIsAmountInvalid(true);
    } else {
      setIsAmountInvalid(false);
    }
  };

  const validateAddress = (addr: string) => {
    setRecipient(addr);
    if (!addr) {
      setIsAddressValid(true);
      return;
    }
    try {
      const pub = new PublicKey(addr);
      setIsAddressValid(PublicKey.isOnCurve(pub));
    } catch {
      setIsAddressValid(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!selectedLock) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > selectedLock.amount) return;
    if (recipient && !isAddressValid) return;

    if (recipient && !savedAddresses.includes(recipient)) {
      const newCtx = [recipient, ...savedAddresses].slice(0, 5);
      setSavedAddresses(newCtx);
      localStorage.setItem("solana_forge_contacts", JSON.stringify(newCtx));
    }

    await onWithdraw(selectedLock, amt, recipient || undefined);
    setIsWithdrawModalOpen(false);
  };

  if (isLoading) {
    return <LockerListSkeleton />;
  }

  if (locks.length === 0) {
    return (
      <Card className="animate-slide-up border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-primary/5 p-4 rounded-full mb-4">
            <Lock className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold">No active locks</h3>
          <p className="text-muted-foreground mb-4">
            Secure your liquidity or team tokens today.
          </p>
          <Button onClick={onCreateNew} className="btn-fintech">
            Create your first Lock
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif text-2xl">
              Liquidity Vaults
            </CardTitle>
            <CardDescription>Manage your locked assets</CardDescription>
          </div>
          <Button onClick={onCreateNew} className="btn-fintech gap-2">
            <Plus className="h-4 w-4" /> New Lock
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-50 pl-8">Asset</TableHead>
                  <TableHead className="text-center">Locked Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Lock ID</TableHead>
                  <TableHead className="min-w-40 text-center">
                    Unlock Time / Withdraw
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocks.map((lock) => {
                  const img = getTokenImage(lock);
                  const isTimeUp = Date.now() > lock.unlockDate.getTime();
                  const isZeroBalance = lock.amount === 0;

                  return (
                    <TableRow key={lock.pubkey}>
                      {/* ASSET */}
                      <TableCell>
                        <div className="flex items-center justify-start gap-3 pl-4">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                            {img ? (
                              <Image
                                src={img}
                                alt="token"
                                layout="fill"
                                objectFit="cover"
                              />
                            ) : (
                              <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-medium flex items-center gap-2">
                              {lock.tokenName || "Unknown"}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{lock.tokenSymbol}</span>
                              <Copy
                                className="h-3 w-3 cursor-pointer hover:text-primary"
                                onClick={() => copyToClipboard(lock.tokenMint)}
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* AMOUNT */}
                      <TableCell className="font-mono text-base pl-4 font-medium text-center">
                        {lock.amount.toLocaleString()}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {isZeroBalance ? (
                            <Badge
                              variant="outline"
                              className="border-gray-400 text-gray-500 gap-1 px-3 py-1 text-xs font-medium w-28 justify-center"
                            >
                              Empty
                            </Badge>
                          ) : isTimeUp ? (
                            <Badge className="bg-green-500 hover:bg-green-600 border-none text-white gap-1 px-3 py-1 text-xs font-medium w-28 justify-center">
                              <Unlock className="h-3.5 w-3.5" /> Unlocked
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-600 hover:bg-blue-700 border-none text-white gap-1 px-3 py-1 text-xs font-medium w-28 justify-center">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* LOCK ID */}
                      <TableCell className="text-center">
                        <div
                          className="flex items-center justify-center gap-1 cursor-pointer pl-4 hover:text-primary group"
                          onClick={() => copyToClipboard(lock.lockId)}
                        >
                          <code className="bg-muted px-2 py-1 rounded text-xs group-hover:bg-primary/10 transition-colors font-mono">
                            {lock.lockId}
                          </code>
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>

                      {/* ACTIONS */}
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {isZeroBalance ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-red-100 text-red-600 hover:bg-red-200 border-red-200"
                              onClick={() => onCloseVault(lock)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Close Vault
                            </Button>
                          ) : isTimeUp ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all font-semibold"
                              onClick={() => handleOpenWithdraw(lock)}
                              disabled={isProcessing}
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Withdraw
                            </Button>
                          ) : (
                            <div className="text-sm flex flex-col items-center">
                              <CountdownTimer
                                targetDate={lock.unlockDate}
                                onExpire={onRefresh}
                              />
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Until {lock.unlockDate.toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* BURN */}
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => onBurn(lock)}
                            title="Burn Tokens"
                            disabled={isZeroBalance}
                          >
                            <Flame className="h-4 w-4 mr-2" />
                            Burn
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* --- Pagination Controls --- */}
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-end gap-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* WITHDRAW MODAL */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-600" /> Withdraw Assets
            </DialogTitle>
            <DialogDescription>
              Withdraw tokens from the vault to your wallet or transfer them.
            </DialogDescription>
          </DialogHeader>

          {selectedLock && (
            <div className="space-y-4 py-2">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Partial Withdrawals Supported.</strong> You can
                  withdraw a specific amount. If you withdraw the full amount,
                  the vault becomes empty and can be closed.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                <span className="text-sm font-medium">Vault Balance</span>
                <span className="font-mono font-bold">
                  {selectedLock.amount.toLocaleString()}{" "}
                  {selectedLock.tokenSymbol}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Amount to Withdraw</Label>
                  <span
                    className="text-xs text-primary cursor-pointer hover:underline"
                    onClick={() =>
                      handleAmountChange(selectedLock.amount.toString())
                    }
                  >
                    Max: {selectedLock.amount}
                  </span>
                </div>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={
                    isAmountInvalid
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {isAmountInvalid && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Ban className="h-3 w-3" /> Amount exceeds vault balance
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Transfer to Address (Optional)</Label>
                  {savedAddresses.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                        >
                          <History className="h-3 w-3" /> Recent
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {savedAddresses.map((addr) => (
                          <DropdownMenuItem
                            key={addr}
                            onClick={() => validateAddress(addr)}
                          >
                            <UserCheck className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="font-mono text-xs">
                              {addr.slice(0, 4)}...{addr.slice(-4)}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Input
                  placeholder="Leave empty to keep in your wallet"
                  value={recipient}
                  onChange={(e) => validateAddress(e.target.value)}
                  className={
                    !isAddressValid && recipient ? "border-destructive" : ""
                  }
                />
                {recipient && !isAddressValid && (
                  <p className="text-xs text-destructive">
                    Invalid Solana Address
                  </p>
                )}
                {recipient && isAddressValid && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Transfers are
                    irreversible.
                  </p>
                )}
              </div>

              <Button
                className="w-full btn-fintech"
                disabled={
                  isProcessing ||
                  !withdrawAmount ||
                  (!!recipient && !isAddressValid) ||
                  isAmountInvalid
                }
                onClick={handleWithdrawSubmit}
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {recipient ? "Withdraw & Transfer" : "Withdraw to Wallet"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

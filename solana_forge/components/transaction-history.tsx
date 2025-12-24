// FILE: components/transaction-history.tsx

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Search,
  ExternalLink,
  Copy,
  Coins,
  Send,
  CheckCircle,
  XCircle,
  Flame,
  Lock,
  Edit,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Unlock,
  Archive,
  Layers,
} from "lucide-react";

import Image from "next/image";
import { HistoryItem } from "./history-provider";
import { useHistory as useTransactionHistory } from "./history-provider";

const formatDate = (ts: number) => {
  if (!ts) return "Unknown Date";
  return new Date(ts).toLocaleString();
};

export function TransactionHistory() {
  // --- MODIFICATION: Destructure loadingProgress ---
  const { history, isLoading, refreshHistory, loadingProgress } =
    useTransactionHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [selectedTx, setSelectedTx] = useState<HistoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredHistory = history.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.signature.toLowerCase().includes(searchLower) ||
      item.mint.toLowerCase().includes(searchLower) ||
      (item.symbol || "").toLowerCase().includes(searchLower) ||
      item.type.toLowerCase().includes(searchLower);

    const matchesType = typeFilter === "all" || item.type === typeFilter;

    let matchesDate = true;
    const now = Date.now();
    const itemTime = item.timestamp;
    if (dateFilter === "7d") {
      matchesDate = now - itemTime <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === "30d") {
      matchesDate = now - itemTime <= 30 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === "1y") {
      matchesDate = now - itemTime <= 365 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedItems = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const openDetails = (tx: HistoryItem) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Created":
        return <Coins className="h-4 w-4 text-green-500" />;
      case "Batch Burn":
        return <Layers className="h-4 w-4 text-red-500" />;
      case "Wallet Burn":
      case "Vault Burn":
      case "Burned":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "Locked":
        return <Lock className="h-4 w-4 text-blue-500" />;
      case "Metadata Update":
        return <Edit className="h-4 w-4 text-purple-500" />;
      case "Transfer Out":
        return <Send className="h-4 w-4 text-indigo-500" />;
      case "Minted More":
        return <Plus className="h-4 w-4 text-teal-500" />;
      case "Withdrawn":
        return <Unlock className="h-4 w-4 text-green-600" />;
      case "Vault Closed":
        return <Archive className="h-4 w-4 text-gray-500" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif text-2xl">
              Transaction History
            </CardTitle>
            {/* --- MODIFICATION START: Display Loading Progress --- */}
            <CardDescription>
              {isLoading && loadingProgress
                ? loadingProgress
                : `Displaying ${paginatedItems.length} of ${filteredHistory.length} transactions (${history.length} total)`}
            </CardDescription>
            {/* --- MODIFICATION END --- */}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshHistory(false, true)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FILTERS */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tx hash, token name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-45">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Created">Token Created</SelectItem>
                <SelectItem value="Batch Burn">Batch Burn</SelectItem>
                <SelectItem value="Wallet Burn">Wallet Burn</SelectItem>
                <SelectItem value="Vault Burn">Vault Burn</SelectItem>
                <SelectItem value="Locked">Token Locked</SelectItem>
                <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                <SelectItem value="Vault Closed">Vault Closed</SelectItem>
                <SelectItem value="Metadata Update">Metadata Update</SelectItem>
                <SelectItem value="Transfer Out">Transfer Out</SelectItem>
                <SelectItem value="Minted More">Minted More</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-37.5">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TABLE (No changes below this line in this component) */}
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Action</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 opacity-20" />
                        <p>No transactions found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((tx) => (
                    <TableRow
                      key={tx.signature + tx.type + tx.mint}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => openDetails(tx)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-full border group-hover:border-primary/50 transition-colors">
                            {getIcon(tx.type)}
                          </div>
                          <span className="font-medium">{tx.type}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {tx.type === "Batch Burn" ? (
                          <div className="flex items-center gap-2">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0 flex items-center justify-center">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">
                                Multiple Assets
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {tx.batchDetails?.length || 0} tokens
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                              {tx.image ? (
                                <Image
                                  src={tx.image}
                                  layout="fill"
                                  objectFit="cover"
                                  alt="icon"
                                />
                              ) : (
                                <Coins className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">
                                {tx.symbol || "UNK"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {tx.mint.slice(0, 4)}...
                              </span>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {tx.type === "Metadata Update" ||
                        tx.type === "Vault Closed" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className="font-mono font-medium">
                            {tx.amount?.toLocaleString()}{" "}
                            {tx.type !== "Batch Burn" && (
                              <span className="text-xs text-muted-foreground">
                                {tx.symbol}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.timestamp)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "Success"
                              ? "secondary"
                              : "destructive"
                          }
                          className="gap-1 font-normal bg-opacity-50"
                        >
                          {tx.status === "Success" ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {tx.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-background"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2">
              <div className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pNum = currentPage - 2 + i;
                    if (pNum > totalPages) pNum = totalPages - (4 - i);
                  }
                  return (
                    <Button
                      key={pNum}
                      variant={currentPage === pNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TRANSACTION DETAILS MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTx && getIcon(selectedTx.type)} Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Signature
                </label>
                <div className="flex items-center gap-2 bg-muted p-2 rounded text-xs font-mono break-all">
                  {selectedTx.signature}
                  <Copy
                    className="h-3 w-3 cursor-pointer hover:text-primary shrink-0"
                    onClick={(e) => copyToClipboard(selectedTx.signature, e)}
                  />
                </div>
                <a
                  href={`https://solscan.io/tx/${selectedTx.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                >
                  View on Solscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-2 rounded">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Date
                  </label>
                  <div className="text-sm">
                    {formatDate(selectedTx.timestamp)}
                  </div>
                </div>
                <div className="bg-muted/30 p-2 rounded">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Status
                  </label>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {selectedTx.status === "Success" ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 p-2 rounded">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Type
                  </label>
                  <div className="text-sm">{selectedTx.type}</div>
                </div>
                <div className="bg-muted/30 p-2 rounded">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Total Amount
                  </label>
                  <div className="text-sm">
                    {selectedTx.type === "Metadata Update" ||
                    selectedTx.type === "Vault Closed"
                      ? "-"
                      : selectedTx.amount?.toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedTx.batchDetails && selectedTx.batchDetails.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Assets Burnt ({selectedTx.batchDetails.length})
                  </label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <div className="divide-y">
                      {selectedTx.batchDetails.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  layout="fill"
                                  objectFit="cover"
                                  alt={item.symbol}
                                />
                              ) : (
                                <Coins className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{item.symbol}</p>
                              <p className="text-xs font-mono text-muted-foreground truncate max-w-37.5">
                                {item.mint}
                              </p>
                            </div>
                          </div>
                          <p className="font-mono text-sm">
                            {item.amount.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Asset
                  </label>
                  <div className="flex items-center gap-3 border p-2 rounded-lg">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                      {selectedTx.image ? (
                        <Image
                          src={selectedTx.image}
                          layout="fill"
                          objectFit="cover"
                          alt="icon"
                        />
                      ) : (
                        <Coins className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {selectedTx.symbol || "Unknown"}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {selectedTx.mint}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTx.lockId && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Lock ID
                  </label>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    {selectedTx.lockId}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
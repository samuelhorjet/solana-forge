// FILE: components/transaction-detail-modal.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HistoryItem } from "./history-provider";
import {
  Copy,
  ExternalLink,
  Coins,
  Send,
  Flame,
  Lock,
  Edit,
  Plus,
  History,
  Unlock,
  Archive,
  Layers,
} from "lucide-react";
import Image from "next/image";

// Helper Functions (kept local to the component for encapsulation)
const formatDate = (ts: number) => {
  if (!ts) return "Unknown Date";
  return new Date(ts).toLocaleString();
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

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: HistoryItem | null;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(transaction.type)} Transaction Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Signature
            </label>
            <div className="flex items-center gap-2 bg-muted p-2 rounded text-xs font-mono break-all">
              {transaction.signature}
              <Copy
                className="h-3 w-3 cursor-pointer hover:text-primary shrink-0"
                onClick={(e) => copyToClipboard(transaction.signature, e)}
              />
            </div>
            <a
              href={`https://solscan.io/tx/${transaction.signature}?cluster=devnet`}
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
              <div className="text-sm">{formatDate(transaction.timestamp)}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Status
              </label>
              <div className="text-sm font-medium flex items-center gap-1">
                {transaction.status === "Success" ? (
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
              <div className="text-sm">{transaction.type}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Total Amount
              </label>
              <div className="text-sm">
                {transaction.type === "Metadata Update" ||
                transaction.type === "Vault Closed"
                  ? "-"
                  : transaction.amount?.toLocaleString()}
              </div>
            </div>
          </div>

          {transaction.batchDetails && transaction.batchDetails.length > 0 ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Assets Burnt ({transaction.batchDetails.length})
              </label>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className="divide-y">
                  {transaction.batchDetails.map((item, i) => (
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
                  {transaction.image ? (
                    <Image
                      src={transaction.image}
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
                    {transaction.symbol || "Unknown"}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {transaction.mint}
                  </p>
                </div>
              </div>
            </div>
          )}

          {transaction.lockId && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Lock ID
              </label>
              <div className="text-xs font-mono bg-muted p-2 rounded">
                {transaction.lockId}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
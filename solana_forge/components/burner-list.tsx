// FILE: components/burner-list.tsx

"use client";

import { useState } from "react"; // <-- Import useState
import { HistoryItem } from "@/components/history-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter, // <-- Import CardFooter
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"; // <-- Import Chevrons
import { Skeleton } from "@/components/ui/skeleton";

interface BurnerListProps {
  history: HistoryItem[];
  onStartBurn: () => void;
  isLoading: boolean;
}

// --- Skeleton Loader Component (Updated with footer) ---
function BurnerListSkeleton() {
  return (
    <Card className="animate-slide-up min-h-125 border-orange-200/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6 bg-orange-50/50 dark:bg-orange-950/10">
        <div>
          <CardTitle className="font-serif text-2xl text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <Flame className="fill-orange-500 text-orange-600" /> Incinerator
            History
          </CardTitle>
          <CardDescription>
            Permanent burn records fetched from the blockchain
          </CardDescription>
        </div>
        <Button
          disabled
          className="bg-linear-to-r from-orange-600 to-red-600 text-white gap-2 shadow-lg shadow-orange-500/20"
        >
          <Flame className="h-4 w-4" /> Start New Burn
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-3 w-28 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          ))}
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

export function BurnerList({
  history,
  onStartBurn,
  isLoading,
}: BurnerListProps) {
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Pagination Logic ---
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = history.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return <BurnerListSkeleton />;
  }

  return (
    <Card className="animate-slide-up min-h-125 border-orange-200/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6 bg-orange-50/50 dark:bg-orange-950/10">
        <div>
          <CardTitle className="font-serif text-2xl text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <Flame className="fill-orange-500 text-orange-600" /> Incinerator
            History
          </CardTitle>
          <CardDescription>
            Permanent burn records fetched from the blockchain
          </CardDescription>
        </div>
        <Button
          onClick={onStartBurn}
          className="bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white gap-2 shadow-lg shadow-orange-500/20"
        >
          <Flame className="h-4 w-4" /> Start New Burn
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {history.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-5 rounded-full inline-block">
              <Flame className="h-10 w-10 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-medium">No burns recorded yet</p>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Burnt tokens are removed from circulation permanently.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedHistory.map((item, idx) => (
              <div
                key={`${item.signature}-${idx}`}
                className="flex items-center justify-between p-4 border rounded-lg bg-background/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                    <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      {item.amount?.toLocaleString()}{" "}
                      <span className="text-muted-foreground">
                        {item.symbol || "Tokens"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.lockId
                        ? `Vault Burn (ID: ${item.lockId})`
                        : "Wallet Burn"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                  <a
                    href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center justify-end gap-1"
                  >
                    View Tx <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
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
  );
}

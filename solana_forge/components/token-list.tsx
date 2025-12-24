// FILE: components/token-list.tsx

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter, // <-- Import CardFooter
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Coins,
  Search,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Send,
  Plus,
  Lock,
  LockOpen,
  Flame,
  Wallet,
  Loader2,
  Eye,
  Edit,
  ChevronLeft, // <-- For Pagination
  ChevronRight, // <-- For Pagination
} from "lucide-react";
import { Token } from "@/types/token";
import Image from "next/image";
import { TokenActionModal } from "@/components/token-action-modal";
import { TokenDetails } from "@/components/token-details";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Skeleton } from "@/components/ui/skeleton"; // <-- Import Skeleton

interface TokenListProps {
  tokens: Token[];
  isLoading?: boolean;
  onTokenAction: (
    action: "view" | "refresh" | "lock" | "burn",
    token?: Token
  ) => void;
}

// --- Skeleton Loader Component ---
function TokenListSkeleton() {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-xl">Your Token List</CardTitle>
            <CardDescription>
              Loading your assets from the blockchain...
            </CardDescription>
          </div>
          <Skeleton className="h-10 w-full md:w-64" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Asset</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Total Supply</TableHead>
                <TableHead>Mint Authority</TableHead>
                <TableHead>Your Balance</TableHead>
                <TableHead className="w-25 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-25" />
                        <Skeleton className="h-3 w-15" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-30" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-30" />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Skeleton className="h-8 w-8 ml-auto" />
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

export function TokenList({
  tokens,
  isLoading,
  onTokenAction,
}: TokenListProps) {
  const { publicKey } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");

  // --- Modal State ---
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [actionType, setActionType] = useState<
    "transfer" | "mint" | "update" | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- View State ---
  const [selectedDetailToken, setSelectedDetailToken] = useState<Token | null>(
    null
  );

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.mintAddress.includes(searchTerm)
  );
  
  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredTokens.length / ITEMS_PER_PAGE);
  const paginatedTokens = filteredTokens.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(num);

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const handleOpenAction = (
    token: Token,
    type: "transfer" | "mint" | "update"
  ) => {
    setActiveToken(token);
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    onTokenAction("refresh");
    setIsModalOpen(false);
  };

  // Helper to check if metadata can be updated
  const canUpdateMetadata = (token: Token) => {
    if (!publicKey) return false;
    const isToken2022 = token.programId === TOKEN_2022_PROGRAM_ID.toBase58();
    const isAuthority = token.authority === publicKey.toBase58();
    return isToken2022 && isAuthority;
  };
  
  if (isLoading) {
    return <TokenListSkeleton />;
  }

  if (selectedDetailToken) {
    return (
      <TokenDetails
        token={selectedDetailToken}
        onBack={() => setSelectedDetailToken(null)}
      />
    );
  }


  if (tokens.length === 0 && !isLoading) {
    return (
      <Card className="border-dashed animate-slide-up">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Coins className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold">No tokens created yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            Use the "Create Token" button above to mint your first asset on
            Solana Devnet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-xl">
                Your Token List
              </CardTitle>
              <CardDescription>
                {/* --- Total Token Count --- */}
                Found {tokens.length} token{tokens.length !== 1 ? "s" : ""}.
                Manage supply, view balances, and transfer assets.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or address..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Asset</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Total Supply</TableHead>
                  <TableHead>Mint Authority</TableHead>
                  <TableHead>Your Balance</TableHead>
                  <TableHead className="w-25 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* --- Use Paginated Tokens --- */}
                {paginatedTokens.map((token) => (
                  <TableRow
                    key={token.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedDetailToken(token)}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted border shrink-0">
                          {token.image ? (
                            <Image
                              src={token.image}
                              alt={token.symbol}
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold">{token.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {token.symbol}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-primary group/addr w-fit"
                        onClick={(e) => copyToClipboard(token.mintAddress, e)}
                        title={token.mintAddress}
                      >
                        <code className="bg-muted px-2 py-1 rounded text-xs group-hover/addr:bg-primary/10 transition-colors font-mono">
                          {token.mintAddress.slice(0, 4)}...
                          {token.mintAddress.slice(-4)}
                        </code>
                        <Copy className="h-3 w-3 opacity-0 group-hover/addr:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-sm">
                        {formatNumber(token.supply)}
                      </div>
                    </TableCell>

                    <TableCell>
                      {token.isMintable ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-600 border-green-200 gap-1 pr-3"
                        >
                          <LockOpen className="h-3 w-3" /> Mintable
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-200 gap-1 pr-3"
                        >
                          <Lock className="h-3 w-3" /> Fixed
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={
                            token.balance > 0
                              ? "font-bold text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {formatNumber(token.balance)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-background"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setSelectedDetailToken(token)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onTokenAction("view", token)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" /> Explorer
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* --- UPDATE METADATA ACTION --- */}
                            <DropdownMenuItem
                              onClick={() => handleOpenAction(token, "update")}
                              disabled={!canUpdateMetadata(token)}
                            >
                              <Edit className="h-4 w-4 mr-2 text-blue-500" />{" "}
                              Update Metadata
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenAction(token, "mint")}
                              disabled={!token.isMintable}
                            >
                              <Plus className="h-4 w-4 mr-2 text-green-500" />{" "}
                              Mint Supply
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                handleOpenAction(token, "transfer")
                              }
                              disabled={token.balance <= 0}
                            >
                              <Send className="h-4 w-4 mr-2" /> Transfer
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onTokenAction("lock", token)}
                              disabled={token.balance <= 0}
                            >
                              <Lock className="h-4 w-4 mr-2 text-orange-400" />{" "}
                              Lock Liquidity
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onTokenAction("burn", token)}
                              disabled={token.balance <= 0}
                            >
                              <Flame className="h-4 w-4 mr-2 text-red-500" />{" "}
                              Burn Token
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      <TokenActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        token={activeToken}
        action={actionType}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
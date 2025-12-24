// FILE: components/token-details.tsx

"use client";

import { Token } from "@/types/token";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Globe,
  Twitter,
  Send,
  Lock,
  LockOpen,
  Zap,
  ShieldCheck,
  Coins,
  FileText,
  Percent,
  Ban,
  User,
  Activity,
  TrendingUp,
  Snowflake,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

interface TokenDetailsProps {
  token: Token;
  onBack: () => void;
}

export function TokenDetails({ token, onBack }: TokenDetailsProps) {
  const isToken2022 = token.programId === TOKEN_2022_PROGRAM_ID.toBase58();
  const ext = token.extensions || {};

  // Count active extensions (using isFrozen from your types)
  const activeExtensions = [
    ext.transferFee,
    ext.nonTransferable,
    ext.permanentDelegate,
    ext.transferHook,
    ext.interestRate,
    ext.isFrozen,
  ].filter(Boolean).length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openLink = (url?: string) => {
    if (url) window.open(url, "_blank");
  };

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(num);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-5xl mx-auto pb-10"
    >
      <motion.div variants={item} className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 pl-0 hover:bg-transparent hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" /> Back to List
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <Card className="overflow-hidden border-none shadow-xl bg-linear-to-br from-background to-muted/50">
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="relative h-32 w-32 rounded-2xl overflow-hidden bg-background shadow-lg border-4 border-background shrink-0">
                {token.image ? (
                  <Image
                    src={token.image}
                    alt={token.symbol}
                    layout="fill"
                    objectFit="cover"
                    className="hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted">
                    <Coins className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                      {token.name}
                    </h1>
                    {isToken2022 ? (
                      <Badge
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Zap className="h-3 w-3 mr-1" /> Token-2022
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                    {token.isMintable ? (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-600 bg-green-500/10"
                      >
                        <LockOpen className="h-3 w-3 mr-1" /> Mintable
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-orange-500 text-orange-600 bg-orange-500/10"
                      >
                        <Lock className="h-3 w-3 mr-1" /> Fixed Supply
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-mono text-muted-foreground font-medium">
                    {token.symbol}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-lg border w-fit max-w-full">
                  <code className="text-sm font-mono truncate max-w-[200px] md:max-w-[400px]">
                    {token.mintAddress}
                  </code>
                  <div className="flex gap-1 border-l pl-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(token.mintAddress)}
                      title="Copy Address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        openLink(
                          `https://solscan.io/token/${token.mintAddress}?cluster=devnet`
                        )
                      }
                      title="View on Solscan"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-4 w-4" /> Market Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Total Supply
                </span>
                <span className="font-mono font-medium">
                  {formatNumber(token.supply)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Decimals</span>
                <span className="font-mono font-medium">{token.decimals}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  User Balance
                </span>
                <span className="font-mono font-bold text-primary">
                  {formatNumber(token.balance)}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-xs text-muted-foreground block mb-1">
                  Mint Authority
                </span>
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded text-xs font-mono">
                  <ShieldCheck className="h-3 w-3 text-green-600" />
                  <span className="truncate">
                    {token.authority || "Revoked / None"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="md:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" /> About {token.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {token.description
                    ? token.description
                    : "No description provided for this asset."}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Links & Socials</h4>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openLink(token.website)}
                    disabled={!token.website}
                  >
                    <Globe className="h-3.5 w-3.5" /> Website
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openLink(token.twitter)}
                    disabled={!token.twitter}
                  >
                    <Twitter className="h-3.5 w-3.5" /> Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openLink(token.telegram)}
                    disabled={!token.telegram}
                  >
                    <Send className="h-3.5 w-3.5" /> Telegram
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {isToken2022 && activeExtensions > 0 && (
        <motion.div variants={item}>
          <Card className="border-blue-500/20 bg-blue-50/30 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Zap className="h-5 w-5" /> Token-2022 Extensions
              </CardTitle>
              <CardDescription>
                Active features detected on this asset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ext.transferFee && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Percent className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold">Transfer Fees</h5>
                      <p className="text-lg font-bold text-blue-600">
                        {ext.transferFee}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fee on every transfer
                      </p>
                    </div>
                  </div>
                )}

                {ext.nonTransferable && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-red-200">
                    <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
                      <Ban className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Soulbound
                      </h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transfers disabled. Bound to wallet.
                      </p>
                    </div>
                  </div>
                )}

                {ext.permanentDelegate && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold">
                        Permanent Delegate
                      </h5>
                      <p className="text-xs font-mono bg-muted p-1 rounded mt-1 truncate w-40">
                        {ext.permanentDelegate.slice(0, 4)}...
                        {ext.permanentDelegate.slice(-4)}
                      </p>
                    </div>
                  </div>
                )}

                {ext.transferHook && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                    <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold">Transfer Hook</h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        Program: {ext.transferHook.slice(0, 6)}...
                      </p>
                    </div>
                  </div>
                )}

                {ext.interestRate !== undefined && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold">
                        Interest Bearing
                      </h5>
                      <p className="text-lg font-bold text-green-600">
                        {ext.interestRate}%
                      </p>
                    </div>
                  </div>
                )}

                {ext.isFrozen && (
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-cyan-200">
                    <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-full">
                      <Snowflake className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                        Default Frozen
                      </h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accounts start frozen.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

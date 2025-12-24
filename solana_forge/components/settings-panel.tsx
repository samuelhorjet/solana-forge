"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Network, LogOut, ShieldCheck } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ThemeToggle } from "./theme-toggle";

interface SettingsPanelProps {
  walletAddress: string;
}

export function SettingsPanel({ walletAddress }: SettingsPanelProps) {
  const { disconnect } = useWallet();

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h2 className="text-3xl font-bold font-serif mb-2">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application preferences and wallet settings
        </p>
      </div>

      <div className="grid gap-6">
        <ThemeToggle />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>
              Your account is initialized and managed automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center p-3 bg-green-500/10 text-green-700 dark:text-green-300 rounded-lg">
                <ShieldCheck className="h-5 w-5 mr-3" />
                <p className="font-medium">
                  Your account is initialized and ready.
                </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Information
            </CardTitle>
            <CardDescription>
              Your connected Solana wallet details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Wallet Address
              </label>
              <div className="mt-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {walletAddress}
              </div>
            </div>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full flex items-center gap-2 hover:bg-destructive/90 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Wallet
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Settings
            </CardTitle>
            <CardDescription>
              Current Solana network configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Network</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Devnet
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
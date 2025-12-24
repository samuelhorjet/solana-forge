"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, Copy, ExternalLink, CheckCircle } from "lucide-react"

interface WalletConnectionProps {
  onWalletConnect?: (walletAddress: string) => void
}

export function WalletConnection({ onWalletConnect }: WalletConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    setIsConnecting(true)

    // Simulate wallet connection (in real app, this would use @solana/wallet-adapter)
    try {
      // Mock wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const mockAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      setWalletAddress(mockAddress)
      setIsConnected(true)
      onWalletConnect?.(mockAddress)
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress("")
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
  }

  if (isConnected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-serif">Wallet Connected</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Devnet
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="text-sm font-mono flex-1 truncate">{walletAddress}</code>
            <Button variant="ghost" size="sm" onClick={copyAddress} className="h-8 w-8 p-0">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={disconnectWallet} className="w-full bg-transparent">
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="font-serif">Connect Your Wallet</CardTitle>
        <CardDescription>Connect your Solana wallet to access SolanaForge features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={connectWallet} disabled={isConnecting} className="w-full" size="lg">
          {isConnecting ? "Connecting..." : "Connect Phantom Wallet"}
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Supports Phantom, Solflare, and other Solana wallets</p>
        </div>
      </CardContent>
    </Card>
  )
}

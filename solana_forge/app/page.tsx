"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, Zap, Shield, ArrowRight, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function HomePage() {
  const { publicKey } = useWallet()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // redirect if wallet is already connected
  useEffect(() => {
    if (publicKey) {
      // short delay so fade-out runs before redirect
      const timeout = setTimeout(() => {
        router.push("/dashboard")
      }, 600)
      return () => clearTimeout(timeout)
    } else {
      setLoading(false)
    }
  }, [publicKey, router])

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center min-h-screen bg-background"
        >
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              className="rounded-full bg-linear-to-brrom-primary to-blue-600 h-20 w-20 flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Coins className="h-10 w-10 text-white" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Loading SolanaForge...</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen bg-background relative overflow-hidden"
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          <header className="border-b bg-background backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
                  <Coins className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-serif bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                    SolanaForge
                  </h1>
                  <p className="text-sm text-muted-foreground">Professional Token Management</p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-linear-to-r from-primary/10 to-blue-500/10 text-primary border-primary/20"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Devnet
              </Badge>
            </div>
          </header>

          <main className="container mx-auto px-4 py-12">
            <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12">
              <div className="text-center space-y-6 max-w-4xl animate-slide-up">
                <h2 className="text-5xl md:text-6xl font-bold font-serif bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight">
                  Welcome to SolanaForge
                </h2>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  The most advanced Solana DApp for professional token creation, portfolio management, and decentralized
                  trading
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Audited Smart Contracts</span>
                  <span className="mx-2">•</span>
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Lightning Fast</span>
                  <span className="mx-2">•</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>Professional Grade</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 animate-fade-in">
                <WalletMultiButton className="bg-linear-to-r! from-primary! to-blue-600! text-white! font-medium! px-8! py-4! rounded-xl! text-lg! transition-all! duration-300! hover:scale-105! hover:shadow-lg! hover:shadow-primary/25!" />
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Connect your wallet to get started
                </p>
              </div>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

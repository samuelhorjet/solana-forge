// FILE: components/dashboard-sidebar.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Coins, History, Settings, Menu, X, Sparkles, Lock, Flame } from "lucide-react" // Added Lock/Flame icons
import { cn } from "@/lib/utils"

interface DashboardSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  walletAddress: string
}

// UPDATED NAVIGATION ITEMS
const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tokens", label: "Token Creator", icon: Coins },
  { id: "locker", label: "Token Locker", icon: Lock }, // Placeholder for future step
  { id: "burner", label: "Token Burner", icon: Flame }, // Placeholder for future step
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar({ activeSection, onSectionChange, walletAddress }: DashboardSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
            <Coins className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
              SolanaForge
            </h1>
            <Badge
              variant="secondary"
              className="bg-linear-to-r from-primary/10 to-blue-500/10 text-primary text-xs border-primary/20 mt-1"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Devnet
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-border/50">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Connected Wallet</p>
          <div className="p-4 bg-linear-to-r from-muted to-muted/50 rounded-xl border border-border/50">
            <code className="text-xs font-mono truncate block text-foreground/80">{walletAddress}</code>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item, index) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-12 text-left transition-all duration-300 group",
                activeSection === item.id
                  ? "bg-linear-to-r from-primary to-blue-600 text-primary-foreground shadow-lg hover:shadow-xl"
                  : "hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.02]",
              )}
              onClick={() => {
                onSectionChange(item.id)
                setIsMobileMenuOpen(false)
              }}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  activeSection === item.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-primary",
                )}
              />
              <span className="font-medium">{item.label}</span>
              {activeSection === item.id && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              )}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  )

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:border-primary/30"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Card
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-80 transform transition-all duration-300 ease-out md:relative md:translate-x-0 bg-card/95 backdrop-blur-sm border-r border-border/50 shadow-xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </Card>
    </>
  )
}
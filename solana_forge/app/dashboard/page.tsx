// FILE: app/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { InitializeGate } from "@/components/InitializeGate";
import { NetworkGate } from "@/components/NetworkGate";
import { HistoryProvider } from "@/components/history-provider"; // Import Provider

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    if (!publicKey) {
      router.replace("/");
    }
  }, [publicKey, router]);

  if (!publicKey) {
    return null;
  }

  return (
    <NetworkGate>
      <InitializeGate>
        <HistoryProvider> {/* WRAP EVERYTHING HERE */}
            <div className="h-screen w-full bg-background flex overflow-hidden relative">
              <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-primary/5 pointer-events-none" />

              <DashboardSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                walletAddress={publicKey.toBase58()}
              />

              <div className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
                <main className="flex-1 p-6 md:p-8">
                  <DashboardContent
                    activeSection={activeSection}
                    walletAddress={publicKey.toBase58()}
                    onSectionChange={setActiveSection}
                  />
                </main>
              </div>
            </div>
        </HistoryProvider>
      </InitializeGate>
    </NetworkGate>
  );
}
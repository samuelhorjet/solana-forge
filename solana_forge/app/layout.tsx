import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SolanaProvider } from "@/components/solana-provider"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SolanaForge - Professional Token Management",
  description: "Professional Solana DApp for token creation, swapping, and portfolio management",
   icons: {
    icon: "/icon.jpeg", // This points to public/icon.png
    shortcut: "/icon.jpeg",
    apple: "/icon.jpeg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange={false}>
          <SolanaProvider>
            <main className="min-h-screen bg-background font-sans antialiased">{children}</main>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

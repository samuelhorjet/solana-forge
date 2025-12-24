"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Appearance</CardTitle>
        <CardDescription>Choose your preferred theme for the application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Monitor className="h-4 w-4" />
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

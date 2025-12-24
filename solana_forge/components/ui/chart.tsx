"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  TooltipProps,
  LegendProps,
} from "recharts"
import { cn } from "@/lib/utils"

// -------------------- Chart Context --------------------

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<"light" | "dark", string>
  }
}

type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within <ChartContainer>")
  return context
}

// -------------------- Chart Container --------------------

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactElement
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn("flex aspect-video justify-center text-xs", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {children ? (
          <ResponsiveContainer>{children}</ResponsiveContainer>
        ) : null}
      </div>
    </ChartContext.Provider>
  )
}

// -------------------- Chart Style --------------------

const THEMES = { light: "", dark: ".dark" } as const

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, conf]) => conf.theme || conf.color
  )
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, conf]) => {
    const color = conf.theme?.[theme as keyof typeof conf.theme] || conf.color
    return color ? `  --color-${key}: ${color};` : ""
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

// -------------------- Custom Tooltip --------------------

const ChartTooltipContent: React.FC<TooltipProps<any, any>> = (props) => {
  const { active } = props as TooltipProps<any, any> & { payload?: any[] }
  const payload = (props as any).payload
  const { config } = useChart()

  if (!active || !payload) return null

  return (
    <div className="border bg-background rounded-lg p-2 text-xs shadow-xl">
      {payload.map((item: { name: any; dataKey: any; value: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined }, index: React.Key | null | undefined) => {
        const key = `${item.name || item.dataKey || "value"}`
        const itemConfig = config[key]
        return (
          <div key={index} className="flex items-center gap-2">
            {itemConfig?.icon && <itemConfig.icon />}
            <span>
              {itemConfig?.label || item.name}: {item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// -------------------- Custom Legend --------------------

const ChartLegendContent = (props: any) => {
  const { config } = useChart()
  const payload = props.payload
  if (!payload) return null

  return (
    <div className="flex gap-4">
      {payload.map((item: { dataKey: any; color: any; value: any; name: any }, idx: React.Key | null | undefined) => {
        const key = `${item.dataKey || "value"}`
        const itemConfig = config[key]
        return (
          <div key={idx} className="flex items-center gap-1.5">
            {itemConfig?.icon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span>{itemConfig?.label || item.value || item.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// -------------------- Exports --------------------

export const ChartTooltip = RechartsTooltip
export const ChartLegend = RechartsLegend

export {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  ChartStyle,
}

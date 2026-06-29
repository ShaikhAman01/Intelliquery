import * as React from "react"

import { cn } from "@/lib/utils"

/*
  Three card variants:
  • surface  (default) — Elevation 1, bg-base-1, shadow-sm
  • elevated            — Elevation 2, bg-base-2, shadow-md
  • well                — Recessed, bg-base-0, inset shadow, monospace (code/SQL display)
*/
type CardVariant = "surface" | "elevated" | "well"

const cardVariantStyles: Record<CardVariant, string> = {
  surface:  "bg-base-1 text-content-1 border border-border rounded-lg",
  elevated: "bg-base-2 text-content-1 border border-[var(--ds-border-moderate)] rounded-lg",
  well:     "bg-base-0 text-content-code font-mono border border-border rounded-md",
}

const cardShadowStyles: Record<CardVariant, React.CSSProperties> = {
  surface:  { boxShadow: "var(--ds-shadow-sm)" },
  elevated: { boxShadow: "var(--ds-shadow-md)" },
  well:     { boxShadow: "var(--ds-shadow-inset)" },
}

function Card({
  className,
  variant = "surface",
  style,
  ...props
}: React.ComponentProps<"div"> & { variant?: CardVariant }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn("flex flex-col gap-5", cardVariantStyles[variant], className)}
      style={{ ...cardShadowStyles[variant], ...style }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "[.border-b]:pb-5",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[14px] leading-none font-semibold text-content-1", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[12px] text-content-2", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-5", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 [.border-t]:pt-5", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

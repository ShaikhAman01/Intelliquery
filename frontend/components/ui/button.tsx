import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    /* Base layout */
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium select-none shrink-0",
    /* Icons */
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    /* Transitions — color/bg fast, scale is instant (active:transition-none) */
    "transition-[background-color,color,border-color,box-shadow] duration-[100ms]",
    "active:scale-[0.97] active:transition-none",
    /* Focus ring — blue, 3px spread */
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    /* Disabled */
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary — Electric Blue fill */
        default:
          "bg-primary text-primary-foreground hover:bg-brand-hover",
        /* Destructive — muted red surface */
        destructive:
          "bg-error-muted text-error border border-error-border hover:bg-[rgba(248,113,113,0.18)]",
        /* Outline — slightly elevated surface, visible border */
        outline:
          "bg-base-2 text-content-1 border border-[var(--ds-border-moderate)] hover:bg-base-3 hover:border-[var(--ds-border-strong)]",
        /* Secondary — muted surface */
        secondary:
          "bg-base-3 text-content-1 hover:bg-base-4",
        /* Ghost — no background, low-contrast text */
        ghost:
          "text-content-2 hover:bg-base-3 hover:text-content-1",
        /* Link — inline, no scale */
        link:
          "text-brand underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        /* 32px default per design spec */
        default:   "h-8 px-3.5 text-[13px]",
        sm:        "h-7 rounded-md gap-1.5 px-3 text-[12px]",
        lg:        "h-9 rounded-md px-4 text-sm",
        icon:      "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

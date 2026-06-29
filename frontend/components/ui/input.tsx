import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Layout */
        "flex h-8 w-full min-w-0 rounded-md px-3 py-1",
        /* Typography */
        "text-[13px] text-content-1 placeholder:text-content-3",
        /* Recessed surface — inputs are "holes" in the surface */
        "bg-base-0 border border-border",
        "shadow-[var(--ds-shadow-inset)]",
        /* Transitions */
        "transition-[border-color,box-shadow] duration-[100ms]",
        /* Focus */
        "outline-none",
        "focus-visible:border-[var(--ds-border-accent)]",
        "focus-visible:shadow-[var(--ds-shadow-focus)]",
        /* Validation error */
        "aria-invalid:border-error-border",
        "aria-invalid:shadow-[0_0_0_3px_rgba(248,113,113,0.20)]",
        /* File input */
        "file:text-content-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
        /* Disabled */
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

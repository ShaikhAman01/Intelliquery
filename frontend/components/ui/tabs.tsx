"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

/*
  Underline-style list — no pill background.
  Wrap this in a container with border-b to get the connected-underline effect.
*/
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex items-center gap-5", className)}
      {...props}
    />
  )
}

/*
  Each trigger sits -1px below the list so the 2px indicator
  covers the container's border-b, creating the connected underline.
*/
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        /* Layout */
        "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap",
        "pb-3 pt-1 px-0",
        /* Typography */
        "text-[13px] font-medium text-content-2",
        /* Transitions */
        "transition-colors duration-[100ms] outline-none",
        /* Active */
        "data-[state=active]:text-content-1",
        /* Disabled */
        "disabled:pointer-events-none disabled:opacity-50",
        /* Icons */
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        /* Underline indicator — scales in from 0 → 1 when active */
        "after:absolute after:bottom-0 after:left-0 after:right-0",
        "after:h-0.5 after:rounded-full after:bg-brand",
        "after:scale-x-0 after:origin-center",
        "after:transition-transform after:duration-[160ms] after:ease-[var(--ds-ease-out)]",
        "data-[state=active]:after:scale-x-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

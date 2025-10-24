"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Compass, Users } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const items = [
    { href: "/dashboard/trips", label: "Trips", icon: Compass },
    { href: "/dashboard/users", label: "Users", icon: Users },
  ]

  if (mobile) {
    return (
      <nav className="grid grid-cols-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center py-2", active && "text-primary")}>
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <TooltipProvider>
      <nav className="p-3 space-y-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative",
                    "hover:bg-accent/40",
                    active && "bg-accent/40 border border-accent/50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 -z-10 rounded-lg"
                      style={{ boxShadow: "0 0 0 1px color-mix(in oklch, var(--color-accent) 45%, transparent)" }}
                    />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}

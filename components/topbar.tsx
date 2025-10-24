"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"

export function Topbar() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "")
    })
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="font-semibold">Airmango Dashboard</div>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{email?.[0]?.toUpperCase() || "A"}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

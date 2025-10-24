import type { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block border-r">
        <Sidebar />
      </aside>
      <div className="flex flex-col">
        <Topbar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      {/* Mobile bottom nav */}
      <div className="md:hidden fixed inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:glass">
        <Sidebar mobile />
      </div>
    </div>
  )
}

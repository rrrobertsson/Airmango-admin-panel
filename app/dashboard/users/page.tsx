"use client"

import useSWR from "swr"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function UsersPage() {
  const { data, isLoading } = useSWR<{ users: { id: string; email: string; created_at: string; role?: string }[] }>(
    "/api/users",
    fetcher,
  )
  const [q, setQ] = useState("")

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  const users = (data?.users ?? []).filter((u) => u.email.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      {/* <div className="max-w-xs">
        <Input placeholder="Search by email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div> */}
      <DataTable
        data={users}
        columns={[
          { key: "email", header: "Email", sortable: true },
          { key: "created_at", header: "Created", sortable: true },
          { key: "role", header: "Role" },
        ]}
      />
    </div>
  )
}

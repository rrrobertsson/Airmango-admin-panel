"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/helpers/formatDate"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"

type Column<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  pageSize = 10,
}: {
  data: T[]
  columns: Column<T>[]
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onView?: (row: T) => void
  pageSize?: number
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [pendingDelete, setPendingDelete] = useState<null | T>(null);
  const [deletingRow, setDeletingRow] = useState<string | number | null>(null);
  

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    )
  }, [data, query])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof typeof a]
      const bv = b[sortKey as keyof typeof b]
      return (String(av) > String(bv) ? 1 : -1) * (sortDir === "asc" ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            {page + 1} / {totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)} className="text-left px-3 py-2 font-medium">
                  <button
                    className={cn("inline-flex items-center gap-1", c.sortable && "hover:underline")}
                    onClick={() => c.sortable && toggleSort(String(c.key))}
                  >
                    {c.header}
                    {c.sortable && <ArrowUpDown className="h-3.5 w-3.5" />}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, idx) => (
              <tr key={idx} className="border-t">
                {columns.map((c) => (
                  <td key={String(c.key)} className="px-3 py-2">
                   {c.key === "created_at"
          ? formatDate(row.created_at)
          : c.render
          ? c.render(row)
          : String(row[c.key as keyof typeof row] ?? "")}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {onView && (
                      <Button size="sm" variant="secondary" onClick={() => onView(row)}>
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button size="sm" variant="default" onClick={() => onEdit(row)}>
                        Edit
                      </Button>
                    )}
                   {onDelete && (
  <AlertDialog open={pendingDelete?.id === row.id} onOpenChange={(open) => !open && setPendingDelete(null)}>
    <AlertDialogTrigger asChild>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setPendingDelete(row)}
      >
        Delete
      </Button>
    </AlertDialogTrigger>

    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {`Are you sure you want to delete "${
            row.title ?? row.name ?? "this item"
          }"?`}
        </AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button
          variant="destructive"
          disabled={!!deletingRow}
          onClick={async () => {
            if (!row.id) return;
            setDeletingRow(row.id);
            try {
              await onDelete(row);
              // ✅ Only close dialog when deletion finishes
              setPendingDelete(null);
            } catch (err) {
              console.error("Delete failed:", err);
            } finally {
              setDeletingRow(null);
            }
          }}
        >
          {deletingRow === row.id ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
            </span>
          ) : (
            "Yes"
          )}
        </Button>
        <AlertDialogCancel
          disabled={!!deletingRow}
          onClick={() => setPendingDelete(null)}
        >
          No
        </AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}

                  </div>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={columns.length + 1}>
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

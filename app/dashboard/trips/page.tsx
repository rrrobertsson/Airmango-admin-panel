"use client"

import useSWR from "swr"
import { DataTable } from "@/components/data-table"
import { TripCreateModal } from "@/components/trips/trip-modal"
import type { Trip } from "@/types/trip"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"
import ViewTripModal from "@/components/trips/view-modal"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TripsPage() {
  const { data, isLoading, mutate } = useSWR<{ trips: Trip[] }>("/api/trips", fetcher)
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }
  

  const rows = data?.trips ?? []

  

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Trips</h1>
      <div>
        <DataTable
          data={rows}
          columns={[
            { key: "title", header: "Title", sortable: true },
            { key: "description", header: "Description" },
            { key: "created_at", header: "Created", sortable: true },
          ]}
          onView={(row) => {
            setSelectedTrip(row);
            setViewOpen(true);
          }}
          onEdit={(row) => setEditingTrip(row)}
          onDelete={async (row) => {
            await fetch(`/api/trips/${row.id}`, { method: "DELETE" })
            await mutate();
          }}
        />
        <TripCreateModal onCreated={() => mutate()} />
      </div>
      {editingTrip && (
        <TripCreateModal
          tripToEdit={editingTrip}
          onCreated={() => {}}
          onUpdated={() => {
            mutate()
            setEditingTrip(null)
          }}
        />
      )}
      <ViewTripModal open={viewOpen} setOpen={setViewOpen} tripData={selectedTrip} />
    </div>
  )
}

"use client"

import { UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FilePreview } from "./FilePreview"

interface DayEntitySectionProps {
  label: string
  allowMultipleMedia?: boolean
  entities: any[]
  onAdd: () => void
  onUpdate: (index: number, patch: any) => void
  onMediaUpload: (index: number, files: FileList | null) => void
  onRemove?: (index: number) => void
  existingSectionMedia?: Array<{ id: string; media_url: string; media_type: string; keep?: boolean }>
  onRemoveExistingSectionMedia?: (mediaId: string) => void
  dayIndex?: number // Add dayIndex to make IDs unique across days
}

export function DayEntitySection({
  label,
  allowMultipleMedia = false,
  entities,
  onAdd,
  onUpdate,
  onMediaUpload,
  onRemove,
  existingSectionMedia = [],
  onRemoveExistingSectionMedia,
  dayIndex = 0
}: DayEntitySectionProps) {
  console.log(entities, "entities");
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button size="sm" variant="outline" onClick={onAdd}>Add {label.slice(0, -1)}</Button>
      </div>

      {entities.map((entity, idx) => (
        <div key={`${label}-${idx}-${entity.id || entity.title || idx}`} className="border rounded-md p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-medium">{label.slice(0, -1)} {idx + 1}</div>
            {onRemove && (
              <Button size="sm" variant="destructive" onClick={() => onRemove(idx)}>
                Remove
              </Button>
            )}
          </div>

          <Input
            placeholder={`${label.slice(0, -1)} title`}
            value={entity.title}
            onChange={e => onUpdate(idx, { title: e.target.value })}
          />

          <Textarea
            placeholder={`${label.slice(0, -1)} description`}
            value={entity.description || ""}
            onChange={e => onUpdate(idx, { description: e.target.value })}
          />

          {allowMultipleMedia && (
            <div className="space-y-2">
              <Label>{label.slice(0, -1)} Media</Label>
              <div
                className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-gray-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50"
                onClick={() => document.getElementById(`day-${dayIndex}-${label}-${idx}-media`)?.click()}
              >
                <UploadCloud className="w-10 h-10 mb-2 text-gray-400" />
                <span className="text-sm">Upload images or videos</span>
              </div>
              <Input
                id={`day-${dayIndex}-${label}-${idx}-media`}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={e => {
                  onMediaUpload(idx, e.target.files)
                  // Clear input so selecting the same files again triggers onChange
                  e.currentTarget.value = ""
                }}
              />

              {/* Per-entity existing media */}
              {(entity.existingMedia || []).filter((m: any) => m.keep !== false).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(entity.existingMedia || []).filter((m: any) => m.keep !== false).map((m: any) => {
                    let parsed: any
                    try {
                      parsed = JSON.parse(m.media_url)
                    } catch {
                      parsed = { url: m.media_url, type: m.media_type }
                    }
                    const { url, type } = parsed
                    const isVideo = type === 'video' || (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')))
                    return (
                      <div key={m.id} className="relative w-28 h-28 border rounded-lg overflow-hidden group">
                        {isVideo ? (
                          <video src={url} className="object-cover w-full h-full" muted />
                        ) : (
                          <img src={url} alt="" className="object-cover w-full h-full" />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate(idx, {
                              existingMedia: (entity.existingMedia || []).map((em: any) => em.id === m.id ? { ...em, keep: false } : em),
                            })
                          }
                          className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* New uploads */}
              <div className="flex flex-wrap gap-2 mt-2">
                {(entity.newMedia || []).map((file: File, i: number) => (
                  <div key={`${file.name}-${file.lastModified}-${i}`} className="relative w-28 h-28 border rounded-lg overflow-hidden group">
                    <FilePreview file={file} />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(idx, {
                          newMedia: entity.newMedia.filter((_: File, j: number) => j !== i),
                        })
                      }
                      className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

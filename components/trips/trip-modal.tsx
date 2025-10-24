"use client"

import { useEffect, useMemo, useState } from "react"
import type { Trip, Day, Activity } from "@/types/trip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { UploadCloud, X } from "lucide-react"
import useSWR from "swr"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectLabel } from '@/components/ui/select'
import { DayEntitySection } from "./DayEntitySection"
import { FilePreview } from "./FilePreview"
import { 
  uploadAllFilesUltraBulk
} from "@/lib/upload-utils"

// Extended Day type to track existing and new media separately

interface AttractionOrAccommodation {
  title: string
  description?: string
  existingMedia?: Array<{ id: string; media_url: string; media_type: string; keep: boolean }>
  newMedia?: File[]
}
interface DayWithMedia extends Omit<Day, 'media'> {
  existingMedia?: Array<{ id: string; media_url: string; media_type: string; keep: boolean }>
  newMedia?: File[]
  activities?: Activity[]
  attractions?: AttractionOrAccommodation[]
  accommodations?: AttractionOrAccommodation[]
  featureMediaId?: string | null
  featureMediaIndex?: number | null
  // store entity media by section with keep flags for removal UX
  existingAttractionMedia?: Array<{ id: string; media_url: string; media_type: string; keep: boolean }>
  existingAccommodationMedia?: Array<{ id: string; media_url: string; media_type: string; keep: boolean }>
}

export function TripCreateModal({
  onCreated,
  onUpdated,
  tripToEdit,
  triggerLabel = "+ Add Trip",
}: {
  onCreated: () => void
  onUpdated?: () => void
  tripToEdit?: Trip | null
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [days, setDays] = useState<DayWithMedia[]>([])
  const [loading, setLoading] = useState(false)
  const [removeExistingCover, setRemoveExistingCover] = useState(false)
  const { toast } = useToast()

  const isEditing = !!tripToEdit

  // Memoized cover preview URL to avoid re-creating object URLs on every re-render
  const coverPreviewUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile])
  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [coverPreviewUrl])

useEffect(() => {
  if (tripToEdit) {
    setTitle(tripToEdit.title || "")
    setDescription(tripToEdit.description || "")
    setDays(
      tripToEdit.days?.map((day: any) => {
        const dayMedia = day.day_media || []
        
        // FIXED: Map activities with their own existing media
        const mappedActivities = (day.activities || []).map((act: any) => {
          // Find media that belongs to this specific activity
          const activityMedia = dayMedia.filter((m: any) => {
            // Check if media is related to this activity
            if (m.related_to === 'activity' && m.activity_id === act.id) {
              return true;
            }
            
            // Also check the legacy JSON format for backward compatibility
            try {
              const parsed = JSON.parse(m.media_url);
              return parsed.activity_id === act.id;
            } catch {
              return false;
            }
          });

          return {
            ...act,
            existingMedia: activityMedia.map((m: any) => {
              try {
                const parsed = JSON.parse(m.media_url);
                return { 
                  id: m.id, 
                  media_url: parsed.url || m.media_url, 
                  media_type: parsed.type || m.media_type, 
                  keep: true 
                };
              } catch {
                return { 
                  id: m.id, 
                  media_url: m.media_url, 
                  media_type: m.media_type, 
                  keep: true 
                };
              }
            }),
            newMedia: [],
          }
        })

        // Map attractions (existing code - keep as is)
        const mappedAttractions = (day.attractions || []).map((attr: any) => ({
          ...attr,
          existingMedia: dayMedia
            .filter(
              (m: any) => (m.related_to ?? 'day') === 'attraction' && m.attraction_id === attr.id
            )
            .map((m: any) => ({ id: m.id, media_url: m.media_url, media_type: m.media_type, keep: true })),
          newMedia: [],
        }))

        // Map accommodations (existing code - keep as is)
        const mappedAccommodations = (day.accommodations || []).map((acc: any) => ({
          ...acc,
          existingMedia: dayMedia
            .filter(
              (m: any) => (m.related_to ?? 'day') === 'accommodation' && m.accommodation_id === acc.id
            )
            .map((m: any) => ({ id: m.id, media_url: m.media_url, media_type: m.media_type, keep: true })),
          newMedia: [],
        }))

        return {
          ...day,
          activities: mappedActivities, // Use the fixed mapping
          attractions: mappedAttractions,
          accommodations: mappedAccommodations,
          existingMedia: dayMedia
            .filter((m: any) => {
              if ((m.related_to ?? 'day') !== 'day') return false;
              try {
                const parsed = JSON.parse(m.media_url);
                return !parsed.activity_id; // Exclude activity media
              } catch {
                return true; // Include non-JSON media (actual day media)
              }
            })
            .map((m: any) => ({ id: m.id, media_url: m.media_url, media_type: m.media_type, keep: true })),
          newMedia: [],
          featureMediaId: day.feature_media_id || null,
        }
      }) || []
    )
    setOpen(true)
  } else {
    setTitle("")
    setDescription("")
    setDays([])
    setCoverFile(null)
  }
}, [tripToEdit])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setDays([])
    setCoverFile(null)
  }

  useEffect(() => {
    if (!open && !isEditing) {
      resetForm()
    }
  }, [open])

  function addDay() {
    setDays((d) => [
      ...d,
      { title: "", description: "", activities: [], existingMedia: [], newMedia: [] },
    ])
  }

  function removeDay(i: number) {
    setDays((d) => d.filter((_, idx) => idx !== i))
  }

  function updateDay(i: number, patch: Partial<DayWithMedia>) {
    setDays((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)))
  }
type EntityType = "activities" | "attractions" | "accommodations";
function addEntity(dayIndex: number, type: EntityType) {
  setDays((prevDays) =>
    prevDays.map((day, idx) => {
      if (idx !== dayIndex) return day

      // base object differs slightly depending on type
      const newItem =
        type === "activities"
          ? { title: "", newMedia: [] } // activities now support media
          : { title: "", newMedia: [] } // media-enabled entities

      return {
        ...day,
        [type]: [...(day[type] || []), newItem],
      }
    })
  )
}
function updateEntity(
  dayIndex: number,
  type: EntityType,
  entityIndex: number,
  patch: Partial<Activity | AttractionOrAccommodation>
) {
  setDays((prevDays) =>
    prevDays.map((day, idx) => {
      if (idx !== dayIndex) return day

      const currentEntities = day[type] as
        | Activity[]
        | AttractionOrAccommodation[]
        | undefined

      if (!currentEntities) return day

      const updatedEntities = currentEntities.map((entity, i) =>
        i === entityIndex ? { ...entity, ...patch } : entity
      )

      return {
        ...day,
        [type]: updatedEntities,
      }
    })
  )
}


function handleEntityMediaUpload(
  dayIndex: number,
  entityType: "attractions" | "accommodations" | "activities",
  entityIndex: number,
  files: FileList | null
) {
  if (!files) return
  const selected = Array.from(files)

  setDays(d =>
    d.map((day, idx) => {
      if (idx !== dayIndex) return day

      return {
        ...day,
        [entityType]: day[entityType]?.map((ent, i) => {
          if (i !== entityIndex) return ent

          // All entity types now support media
          if (entityType === "attractions" || entityType === "accommodations") {
            const withMedia = ent as AttractionOrAccommodation
            return {
              ...withMedia,
              newMedia: [...(withMedia.newMedia || []), ...selected],
            }
          }

          // activities now support media
          if (entityType === "activities") {
            const withMedia = ent as Activity
            return {
              ...withMedia,
              newMedia: [...(withMedia.newMedia || []), ...selected],
            }
          }

          return ent
        }),
      }
    })
  )
}




function removeEntity(dayIndex: number, type: EntityType, entityIndex: number) {
  setDays((prevDays) =>
    prevDays.map((day, i) => {
      if (i !== dayIndex) return day;

      // Remove the specific entity (activity/attraction/accommodation) by index
      const updatedEntities =
        day[type]?.filter((_, idx) => idx !== entityIndex) || [];

      return { ...day, [type]: updatedEntities };
    })
  );
}


  function handleDayMediaUpload(dayIndex: number, files: FileList | null) {
    if (!files) return
    const selectedFiles = Array.from(files)
    setDays((d) =>
      d.map((day, idx) =>
        idx === dayIndex
          ? { ...day, newMedia: [...(day.newMedia || []), ...selectedFiles] }
          : day
      )
    )
  }

  function removeExistingMedia(dayIndex: number, mediaId: string) {
    setDays((d) =>
      d.map((day, idx) => {
        if (idx !== dayIndex) return day
        const updated: any = {
          ...day,
          existingMedia: day.existingMedia?.map((m) =>
            m.id === mediaId ? { ...m, keep: false } : m
          ),
        }
        // If the removed media was featured, clear the feature selection (do not auto-assign)
        if (day.featureMediaId === mediaId) {
          updated.featureMediaId = null
        }
        return updated
      })
    )
  }

  function removeNewMedia(dayIndex: number, fileIndex: number) {
    setDays((d) =>
      d.map((day, idx) => {
        if (idx !== dayIndex) return day
        const nextNewMedia = day.newMedia?.filter((_, i) => i !== fileIndex) || []
        let nextFeatureIndex = day.featureMediaIndex ?? null
        if (nextFeatureIndex != null) {
          if (fileIndex === nextFeatureIndex) nextFeatureIndex = null
          else if (fileIndex < nextFeatureIndex) nextFeatureIndex = nextFeatureIndex - 1
        }
        return { ...day, newMedia: nextNewMedia, featureMediaIndex: nextFeatureIndex }
      })
    )
  }

/**
 * HANDLE SAVE - ULTRA BULK UPLOAD FLOW
 * 
 * This function uploads ALL media files in a single API call,
 * then sends only URLs to the trips API. Maximum efficiency!
 * 
 * Flow:
 * 1. Collect ALL files from all sources (cover, days, attractions, accommodations)
 * 2. Upload ALL files in ONE API call
 * 3. Map URLs back to their sources
 * 4. Send single JSON payload with URLs to trips API
 * 
 * Benefits:
 * - Only 2 API calls total (upload + save trip)
 * - No 413 errors (files handled by dedicated upload API)
 * - Maximum efficiency for large numbers of files
 * - Single request for all uploads
 */


async function handleSave() {
  setLoading(true);
  try {
    // ========================================
    // STEP 1: COLLECT ALL FILES FOR ULTRA BULK UPLOAD
    // ========================================
    const allFiles: { file: File; bucket: string; folder?: string; source: string; index?: number }[] = []
    
    // Collect trip cover
    if (coverFile) {
      allFiles.push({
        file: coverFile,
        bucket: 'trip-covers',
        source: 'cover'
      })
    }
    
    // Collect all day media files
    days.forEach((day, dayIndex) => {
      // Day-level media - FIXED: Include fileIndex in source key
      if (day.newMedia && day.newMedia.length > 0) {
        day.newMedia.forEach((file, fileIndex) => {
          allFiles.push({
            file,
            bucket: 'day-media',
            folder: 'days',
            source: `day_${dayIndex}_media_${fileIndex}`,
            index: fileIndex
          })
        })
      }
      
      // Attraction media - FIXED: Include fileIndex in source key
      if (day.attractions) {
        day.attractions.forEach((attraction, attrIndex) => {
          if (attraction.newMedia && attraction.newMedia.length > 0) {
            attraction.newMedia.forEach((file, fileIndex) => {
              allFiles.push({
                file,
                bucket: 'day-media',
                folder: 'attractions',
                source: `day_${dayIndex}_attraction_${attrIndex}_media_${fileIndex}`,
                index: fileIndex
              })
            })
          }
        })
      }
      
      // Accommodation media - FIXED: Include fileIndex in source key
      if (day.accommodations) {
        day.accommodations.forEach((accommodation, accIndex) => {
          if (accommodation.newMedia && accommodation.newMedia.length > 0) {
            accommodation.newMedia.forEach((file, fileIndex) => {
              allFiles.push({
                file,
                bucket: 'day-media',
                folder: 'accommodations',
                source: `day_${dayIndex}_accommodation_${accIndex}_media_${fileIndex}`,
                index: fileIndex
              })
            })
          }
        })
      }
      
      // Activity media - FIXED: Include fileIndex in source key
      if (day.activities) {
        day.activities.forEach((activity, actIndex) => {
          if (activity.newMedia && activity.newMedia.length > 0) {
            activity.newMedia.forEach((file, fileIndex) => {
              allFiles.push({
                file,
                bucket: 'day-media',
                folder: 'activities',
                source: `day_${dayIndex}_activity_${actIndex}_media_${fileIndex}`,
                index: fileIndex
              })
            })
          }
        })
      }
    })
    
    // ========================================
    // STEP 2: ULTRA BULK UPLOAD - ALL FILES IN ONE CALL
    // ========================================
    
    let uploadedFiles: { url: string; type: string; originalFile: File }[] = []
    if (allFiles.length > 0) {
      uploadedFiles = await uploadAllFilesUltraBulk(allFiles)
    }
    
    // ========================================
    // STEP 3: MAP UPLOADED FILES BACK TO THEIR SOURCES
    // ========================================
    
    // Create a map using index (more reliable than File object reference)
    const uploadResultMap = new Map<string, { url: string; type: string }>()
    
    uploadedFiles.forEach((uploaded, index) => {
      const sourceInfo = allFiles[index]
      uploadResultMap.set(sourceInfo.source, { url: uploaded.url, type: uploaded.type })
    })
    
    
    // Get cover URL
    let coverPublicUrl: string | undefined = undefined
    const coverUpload = uploadResultMap.get('cover')
    if (coverUpload) {
      coverPublicUrl = coverUpload.url
      console.log('Cover URL found:', coverPublicUrl)
    } else {
      console.log('Cover upload not found in map')
    }
    
    // Process all days and map their uploaded media
    const payloadDays = days.map((day, dayIndex) => {
      // Map day-level media using unique source identifiers
      const uploadedDayMedia: { url: string; type: string }[] = []
      if (day.newMedia && day.newMedia.length > 0) {
        day.newMedia.forEach((file, fileIndex) => {
          const result = uploadResultMap.get(`day_${dayIndex}_media_${fileIndex}`)
          if (result) uploadedDayMedia.push(result)
        })
      }
      
      // Map attraction media
      const mappedAttractions = (day.attractions || []).map((a: any, attrIndex) => {
        const uploadedMedia: { url: string; type: string }[] = []
        if (a.newMedia && a.newMedia.length > 0) {
          a.newMedia.forEach((file: File, fileIndex: number) => {
            const result = uploadResultMap.get(`day_${dayIndex}_attraction_${attrIndex}_media_${fileIndex}`)
            if (result) uploadedMedia.push(result)
          })
        }
        
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          uploadedMedia, // API expects 'uploadedMedia'
        }
      })
      
      // Map accommodation media
      const mappedAccommodations = (day.accommodations || []).map((a: any, accIndex) => {
        const uploadedMedia: { url: string; type: string }[] = []
        if (a.newMedia && a.newMedia.length > 0) {
          a.newMedia.forEach((file: File, fileIndex: number) => {
            const result = uploadResultMap.get(`day_${dayIndex}_accommodation_${accIndex}_media_${fileIndex}`)
            if (result) uploadedMedia.push(result)
          })
        }
        
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          uploadedMedia, // API expects 'uploadedMedia'
        }
      })
      
      // Map activity media
      const mappedActivities = (day.activities || []).map((a: any, actIndex) => {
        const uploadedMedia: { url: string; type: string }[] = []
        if (a.newMedia && a.newMedia.length > 0) {
          a.newMedia.forEach((file: File, fileIndex: number) => {
            const result = uploadResultMap.get(`day_${dayIndex}_activity_${actIndex}_media_${fileIndex}`)
            if (result) uploadedMedia.push(result)
          })
        }
        
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          uploadedMedia, // API expects 'uploadedMedia'
        }
      })
      
      return {
        id: day.id,
        title: day.title,
        description: day.description,
        order_index: dayIndex, // Add order_index based on the day's position
        activities: mappedActivities,
        attractions: mappedAttractions,
        accommodations: mappedAccommodations,
        featureMediaId: day.featureMediaId || null,
        featureMediaIndex: day.featureMediaIndex ?? null,
        uploadedDayMedia, // API expects 'uploadedDayMedia'
        // Media removal tracking (for edit mode)
        dayRemovedMediaIds: (day.existingMedia || []).filter((m: any) => m.keep === false).map((m: any) => m.id),
        attractionRemovedMediaIds: (day.attractions || []).flatMap((a: any) => (a.existingMedia || []).filter((m: any) => m.keep === false).map((m: any) => m.id)),
        accommodationRemovedMediaIds: (day.accommodations || []).flatMap((a: any) => (a.existingMedia || []).filter((m: any) => m.keep === false).map((m: any) => m.id)),
        activityRemovedMediaIds: (day.activities || []).flatMap((a: any) => (a.existingMedia || []).filter((m: any) => m.keep === false).map((m: any) => m.id)),
      }
    })

    // ========================================
    // STEP 4: SEND SINGLE JSON PAYLOAD TO TRIPS API
    // ========================================
    
    const jsonPayload = {
      title,
      description,
      cover_image: coverPublicUrl,
      days: payloadDays,
      user_id: creatorId,
    };


    // Send only the JSON payload to the trips API (single API call)
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `/api/trips/${tripToEdit?.id}` : "/api/trips";
    const res = await fetch(url, { 
      method, 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(jsonPayload) // Only URLs, no files!
    });

    if (!res.ok) throw new Error(await res.text());

    // Success! Show appropriate message and close modal
    toast({ title: isEditing ? "Trip updated" : "Trip created" });
    setOpen(false);

    if (isEditing) onUpdated?.();
    else onCreated();

    resetForm();
  } catch (e: any) {
    // Handle any errors during the upload or save process
    console.error('Save error:', e.message)
    toast({
      title: isEditing ? "Failed to update trip" : "Failed to create trip",
      description: e.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}


  function getMediaSrc(media: any): string {
    if (media instanceof File) return URL.createObjectURL(media)

    try {
      // media.media_url may be a JSON string { url, type } or a plain URL string
      if (typeof media.media_url === 'string') {
        try {
          const parsed = JSON.parse(media.media_url)
          return parsed?.url || ''
        } catch {
          return media.media_url || ''
        }
      }
      // if already an object
      return media?.media_url?.url || ''
    } catch {
      return typeof media?.media_url === 'string' ? media.media_url : ''
    }
  }

  function isVideoMedia(media: any): boolean {
    if (media instanceof File) return media.type.startsWith("video/")

    try {
      if (typeof media.media_url === 'string') {
        try {
          const parsed = JSON.parse(media.media_url)
          return parsed?.type === 'video' || Boolean(parsed?.url?.toLowerCase?.().endsWith('.mp4'))
        } catch {
          const url = media.media_url.toLowerCase?.() || ''
          return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')
        }
      }
      const parsed = media?.media_url
      if (parsed && typeof parsed === 'object') {
        const url = parsed.url?.toLowerCase?.() || ''
        return parsed.type === 'video' || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')
      }
      return false
    } catch {
      return false
    }
  }

  const fetcher = (url: string) => fetch(url).then(r => r.json())
  // Lazy-load users ONLY when the dialog is open to avoid unnecessary requests
  const { data: userData, isLoading: usersLoading } = useSWR(open ? '/api/users' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })
  const users = userData?.users || [];
  // Fix: allow user_id in Trip type temporarily for type safety
  // (or extend Trip type as needed in your types/trip.ts)
  const tripUserId = (tripToEdit as any)?.user_id;
  const [creatorId, setCreatorId] = useState<string>(tripUserId || (Array.isArray(users) && users.length > 0 ? users[0].id : ""));
  const [userSearch, setUserSearch] = useState("");

  // Set a default creator after users load if none selected yet
  useEffect(() => {
    if (!creatorId && Array.isArray(users) && users.length > 0) {
      setCreatorId(users[0].id)
    }
  }, [users])

  
  
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen && isEditing) {
          onUpdated?.()
        }
      }}
    >
      {!isEditing && (
        <DialogTrigger asChild>
          <Button className="mt-4 md:ml-auto" size="lg" variant="default">{triggerLabel}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Trip" : "New Trip"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
          <div className="grid gap-2">
            <Label>Trip Creator</Label>
            <Select value={creatorId} onValueChange={setCreatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={usersLoading ? 'Loading users…' : 'Select creator'}>
                  {Array.isArray(users) && users.find((u: any) => u.id === creatorId)?.email || 'Select creator'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-auto">
                <div className="p-2 sticky top-0 bg-white z-10">
                  <Input placeholder="Search users…" value={userSearch} className="w-full" onChange={e => setUserSearch(e.target.value)} />
                </div>
                {Array.isArray(users) && users.filter((u: any) => u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

<div className="space-y-2">
  <Label>Cover Image</Label>

  <div
    className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 ${
      coverFile || (isEditing && tripToEdit?.cover_image && !removeExistingCover) ? "border-gray-300" : "border-gray-200"
    }`}
    onClick={() => document.getElementById("coverFileInput")?.click()}
  >
    {coverFile || (isEditing && tripToEdit?.cover_image && !removeExistingCover) ? (
      <div className="relative w-40 h-40">
          <img
          src={coverFile ? (coverPreviewUrl as string) : (tripToEdit?.cover_image as string)}
          alt="Cover"
          className="object-cover w-full h-full rounded-lg border"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCoverFile(null);
            if (isEditing) setRemoveExistingCover(true); // mark existing cover as removed
          }}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
        >
          <X size={16} />
        </button>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center text-gray-500">
        <UploadCloud className="w-10 h-10 mb-2 text-gray-400" />
        <span className="text-sm">Click to upload cover image</span>
      </div>
    )}
  </div>

  <input
    id="coverFileInput"
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      setCoverFile(e.target.files?.[0] || null);
      setRemoveExistingCover(false); // reset removal if a new file is chosen
      // Allow selecting the same file again by clearing the input value
      e.currentTarget.value = "";
    }}
  />
</div>



          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <Label>Days</Label>
              <Button size="sm" variant="secondary" onClick={addDay}>
                Add day
              </Button>
            </div>

            {days.map((day, i) => 
            (
              <div key={day.id ?? i} className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Day {i + 1}</div>
                  <Button size="sm" variant="destructive" onClick={() => removeDay(i)}>
                    Remove
                  </Button>
                </div>

                <Input
                  placeholder="Day title"
                  value={day.title}
                  onChange={(e) => updateDay(i, { title: e.target.value })}
                />

                <Textarea
                  placeholder="Day description"
                  value={day.description}
                  onChange={(e) => updateDay(i, { description: e.target.value })}
                />

    <div className="space-y-2">
      <Label>Day Media (Images or Videos)</Label>
      <div
        className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center text-gray-500 transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50"
        onClick={() => document.getElementById(`dayMediaInput-${i}`)?.click()}
      >
        <UploadCloud className="w-10 h-10 mb-2 text-gray-400" />
        <span className="text-sm font-medium">Click to upload images or videos</span>
        <span className="text-xs text-gray-400 mt-1">(You can select multiple files)</span>
      </div>
      <Input
        id={`dayMediaInput-${i}`}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          handleDayMediaUpload(i, e.target.files)
          // Clear to allow re-selecting same files
          e.currentTarget.value = ""
        }}
      />

      <div className="flex flex-wrap gap-3 mt-3">
        {day.existingMedia
          ?.filter((m) => m.keep)
          .map((media, idx) => {
            const src = getMediaSrc(media)
            const isVideo = isVideoMedia(media)
            return (
              <div
                key={`existing-${media.id}`}
                  className={`relative w-28 h-28 rounded-xl border overflow-hidden group ${
    day.featureMediaId === media.id ? "ring-4 ring-yellow-400" : ""
  }`}
              >
                {isVideo ? (
                  <video
                    src={src}
                    className="object-cover w-full h-full"
                    controls
                  />
                ) : (
                  <img
                    src={src}
                    alt={`existing-media-${idx}`}
                    className="object-cover w-full h-full"
                  />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => removeExistingMedia(i, media.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                            <button
            type="button"
            onClick={() => updateDay(i, { featureMediaId: media.id })}
            className="absolute bottom-1 left-1 bg-yellow-400 text-black rounded-md px-2 py-1 text-xs font-medium hover:bg-yellow-500"
          >
            {day.featureMediaId === media.id ? "Featured" : "Set Featured"}
          </button>
    
                </div>
              </div>
            )
          })}
        {day.newMedia?.map((file, idx) => 
          <div
            key={`new-${file.name}-${file.lastModified}-${idx}`}
            className="relative w-28 h-28 rounded-xl border overflow-hidden group"
          >
            <FilePreview file={file} />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => removeNewMedia(i, idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                <X size={14} />
              </button>
<button
  type="button"
  onClick={() => updateDay(i, { featureMediaIndex: idx })}
  className={`absolute bottom-1 left-1 ${
    day.featureMediaIndex === idx ? "bg-yellow-500" : "bg-yellow-400"
  } text-black rounded-md px-2 py-1 text-xs font-medium hover:bg-yellow-500`}
>
  {day.featureMediaIndex === idx ? "Featured" : "Set Featured"}
</button>

            </div>
          </div>
        )}
      </div>
    </div>
    {/* Activities Section */}
<DayEntitySection
  label="Activities"
  allowMultipleMedia={true}
  entities={day.activities || []}
  onAdd={() => addEntity(i, "activities")}
  onUpdate={(idx, patch) => updateEntity(i, "activities", idx, patch)}
  onRemove={(idx) => removeEntity(i, "activities", idx)}
  onMediaUpload={(idx, files) =>
    handleEntityMediaUpload(i, "activities", idx, files)
  }
  dayIndex={i}
/>

<DayEntitySection
  label="Attractions"
  allowMultipleMedia
  entities={day.attractions || []}
  onAdd={() => addEntity(i, "attractions")}
  onUpdate={(idx, patch) => updateEntity(i, "attractions", idx, patch)}
  onRemove={(idx) => removeEntity(i, "attractions", idx)}
  onMediaUpload={(idx, files) =>
    handleEntityMediaUpload(i, "attractions", idx, files)
  }
  dayIndex={i}
/>

<DayEntitySection
  label="Accommodations"
  allowMultipleMedia
  entities={day.accommodations || []}
  onAdd={() => addEntity(i, "accommodations")}
  onUpdate={(idx, patch) => updateEntity(i, "accommodations", idx, patch)}
  onRemove={(idx) => removeEntity(i, "accommodations", idx)}
  onMediaUpload={(idx, files) =>
    handleEntityMediaUpload(i, "accommodations", idx, files)
  }
  dayIndex={i}
/>
              </div>
 ) )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleSave} loading={loading} size="lg" variant="default">
            {loading ? "Saving…" : isEditing ? "Update Trip" : "Save Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
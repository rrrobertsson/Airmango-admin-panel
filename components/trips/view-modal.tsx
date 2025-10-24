"use client"

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import useSWR from "swr"

interface ViewTripModalProps {
  open: boolean
  setOpen: (value: boolean) => void
  tripData: any
}

export default function ViewTripModal({ open, setOpen, tripData }: ViewTripModalProps) {
  if (!tripData) return null

  const fetcher = (url: string) => fetch(url).then((r) => r.json())
  const { data: usersResp } = useSWR('/api/users', fetcher)
  const users = usersResp?.users || []
  const creator = Array.isArray(users) ? users.find((u: any) => u.id === tripData.user_id) : null
  console.log("tripDatzza", tripData)
  return (
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    showCloseButton={false}
    className="
      fixed top-1/2 left-1/2 
      -translate-x-1/2 -translate-y-1/2
      w-full max-w-5xl 
      max-h-[90vh]
      flex flex-col 
      overflow-hidden
      bg-white/70
      backdrop-blur-2xl
      rounded-3xl
      p-0
      animate-in fade-in-0 zoom-in-95
    "
  >
    {/* Subtle Ambient Glow */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02),transparent_50%)] pointer-events-none" />

    {/* Header Image */}
    {tripData.cover_image && (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full h-64 flex-shrink-0 overflow-hidden rounded-t-3xl"
      >
        <Image
          src={tripData.cover_image}
          alt="Cover"
          fill
          priority
          className="object-cover transform hover:scale-105 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        <div className="absolute bottom-6 left-6 z-10">
          <h1 className="text-2xl font-semibold text-white drop-shadow-lg">
            {tripData.title}
          </h1>
          {creator?.email && (
            <div className="mt-1 text-white/90 text-sm">By {creator.email}</div>
          )}
        </div>

        {/* Smooth Animated Close Button */}
        <motion.button
          onClick={() => setOpen(false)}
          whileHover={{ rotate: 90, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="
            absolute top-5 right-5 
            bg-white/80 hover:bg-white 
            text-gray-700 rounded-full p-2.5 
            shadow-lg backdrop-blur-md 
            transition-all duration-50 ease-in-out
          "
        >
          <X className="w-5 h-5" />
        </motion.button>
      </motion.div>
    )}

    {/* Scrollable Body */}
    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scroll space-y-10 relative bg-gradient-to-b from-transparent to-white/70">
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />

      {/* Overview */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-white/80 border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Overview</h2>
        {creator?.email && (
          <div className="text-sm text-gray-600 mb-2">Creator: <span className="font-medium text-gray-800">{creator.email}</span></div>
        )}
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{tripData.description}</p>
      </motion.section>

      {/* Itinerary */}
      <section className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Detailed Itinerary</h3>
        {tripData.days?.map((day: any, i: number) => (
          <motion.div
            key={day.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-semibold text-gray-900">
                  Day {i + 1}: {day.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">{day.description}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
                Day {i + 1}
              </span>
            </div>

            {/* Gallery */}
            {day.day_media?.filter((m: any) => {
              if ((m.related_to ?? 'day') !== 'day') return false;
              try {
                const parsed = JSON.parse(m.media_url);
                return !parsed.activity_id; // Exclude activity media
              } catch {
                return true; // Include non-JSON media (actual day media)
              }
            }).length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Gallery</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {day.day_media
                    .filter((media: any) => {
                      if ((media.related_to ?? 'day') !== 'day') return false;
                      try {
                        const parsed = JSON.parse(media.media_url);
                        return !parsed.activity_id; // Exclude activity media
                      } catch {
                        return true; // Include non-JSON media (actual day media)
                      }
                    })
                    .map((media: any) => {
                      let parsed
                      try {
                        parsed = JSON.parse(media.media_url)
                      } catch {
                        parsed = { url: media.media_url, type: media.media_type }
                      }
                      const { url, type } = parsed
                      const isFeatured = media.id === day.feature_media_id

                      return (
                        <motion.div
                          key={media.id}
                          whileHover={{ scale: 1.03 }}
                          transition={{ duration: 0.2 }}
                          className={`
              relative w-full aspect-square rounded-xl overflow-hidden shadow-sm group
              ${isFeatured ? "border-4 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]" : "border border-gray-200"}
            `}
                        >
                          {type === "image" ? (
                            <Image
                              src={url}
                              alt="media"
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <video
                              src={url}
                              className="object-cover w-full h-full rounded-xl"
                              muted
                              loop
                              autoPlay
                            />
                          )}
                          {isFeatured && (
                            <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-semibold px-2 py-0.5 rounded-md shadow-md">
                              Featured
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
                        </motion.div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Activities */}
            {day.activities?.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Activities</Label>
                <div className="space-y-4">
                  {day.activities.map((activity: any, idx: number) => {
                    const mediaForActivity = (day.day_media || []).filter((m: any) => {
                      return m.related_to === 'activity' && m.activity_id === activity.id;
                    });
                    return (
                      <div key={activity.id || idx} className="rounded-xl border p-4 bg-white/70">
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        {activity.description && (
                          <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                        )}
                        {mediaForActivity.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                            {mediaForActivity.map((media: any) => {
                              const url = media.media_url;
                              const type = media.media_type;
                              return (
                                <div key={media.id} className="relative w-full aspect-square rounded-xl overflow-hidden border">
                                  {type === 'image' ? (
                                    <img src={url} alt="" className="object-cover w-full h-full" />
                                  ) : (
                                    <video src={url} className="object-cover w-full h-full" controls />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attractions */}
            {day.attractions?.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Attractions</Label>
                <div className="space-y-4">
                  {day.attractions.map((attr: any, idx: number) => {
                    const mediaForAttraction = (day.day_media || []).filter(
                      (m: any) => (m.related_to ?? 'day') === 'attraction' && m.attraction_id === attr.id
                    )
                    return (
                      <div key={attr.id || idx} className="rounded-xl border p-4 bg-white/70">
                        <div className="font-medium text-gray-900">{attr.title}</div>
                        {attr.description && (
                          <div className="text-sm text-gray-600 mt-1">{attr.description}</div>
                        )}
                        {mediaForAttraction.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                            {mediaForAttraction.map((media: any) => {
                              const url = media.media_url;
                              const type = media.media_type;
                              return (
                                <div key={media.id} className="relative w-full aspect-square rounded-xl overflow-hidden border">
                                  {type === 'image' ? (
                                    <img src={url} alt="" className="object-cover w-full h-full" />
                                  ) : (
                                    <video src={url} className="object-cover w-full h-full" controls />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Accommodations */}
            {day.accommodations?.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Accommodations</Label>
                <div className="space-y-4">
                  {day.accommodations.map((acc: any, idx: number) => {
                    const mediaForAccommodation = (day.day_media || []).filter(
                      (m: any) => (m.related_to ?? 'day') === 'accommodation' && m.accommodation_id === acc.id
                    )
                    return (
                      <div key={acc.id || idx} className="rounded-xl border p-4 bg-white/70">
                        <div className="font-medium text-gray-900">{acc.title}</div>
                        {acc.description && (
                          <div className="text-sm text-gray-600 mt-1">{acc.description}</div>
                        )}
                        {mediaForAccommodation.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                            {mediaForAccommodation.map((media: any) => {
                              const url = media.media_url;
                              const type = media.media_type;
                              return (
                                <div key={media.id} className="relative w-full aspect-square rounded-xl overflow-hidden border">
                                  {type === 'image' ? (
                                    <img src={url} alt="" className="object-cover w-full h-full" />
                                  ) : (
                                    <video src={url} className="object-cover w-full h-full" controls />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </section>
    </div>

    {/* Footer */}
    <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-white/70 backdrop-blur-md rounded-b-3xl flex justify-end">
      <Button
        variant="default"
        size="lg"
        onClick={() => setOpen(false)}
        className="rounded-lg font-medium shadow-sm hover:shadow-md hover:scale-[1.02] transition-all bg-gray-800 text-white hover:bg-gray-700"
        loading={false}
      >
        Close
      </Button>
    </DialogFooter>

    {/* Neutral Scrollbar */}
    <style jsx global>{`
      .custom-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scroll::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 9999px;
      }
      .custom-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.25);
      }
    `}</style>
  </DialogContent>
</Dialog>

  )
}

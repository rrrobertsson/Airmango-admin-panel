"use client"

import React, { useEffect, useState } from "react"

export function FilePreview({ file, className }: { file: File; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [rev, setRev] = useState(0)

  // Create object URL only after mount; revoke previous on change/unmount.
  useEffect(() => {
    if (!file) return
    const newUrl = URL.createObjectURL(file)
    setUrl(newUrl)
    return () => {
      try {
        URL.revokeObjectURL(newUrl)
      } catch {}
    }
  }, [file, rev])

  // If the media errors to load (rare in StrictMode), try re-creating the URL once.
  const handleError = () => {
    setRev((r) => (r < 1 ? r + 1 : r))
  }

  if (!url) {
    return <div className={className || "w-full h-full bg-gray-100"} />
  }

  const isVideo = file.type.startsWith("video/")
  if (isVideo) {
    return (
      <video
        src={url}
        className={className || "object-cover w-full h-full"}
        controls
        preload="metadata"
        onError={handleError}
      />
    )
  }

  return <img src={url} alt="" className={className || "object-cover w-full h-full"} onError={handleError} />
}

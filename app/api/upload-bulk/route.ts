import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSafeFileName } from "@/helpers/nameSenitizer"

/**
 * BULK UPLOAD FALLBACK API
 * 
 * This endpoint handles bulk file uploads when direct Supabase Storage uploads fail.
 * It's used as a fallback when RLS policies prevent direct client uploads.
 */

export async function POST(req: Request) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize admin client for storage operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await req.formData()
    const bucket = String(formData.get('bucket') || 'day-media')
    const folder = String(formData.get('folder') || '')

    console.log('Bulk upload API called with bucket:', bucket, 'folder:', folder)

    // Ensure bucket exists
    await admin.storage.createBucket(bucket, { public: true }).catch(() => {})

    const uploadedUrls: { url: string; type: string }[] = []

    // Process all files
    for (const [key, value] of formData.entries()) {
      console.log('Processing form data key:', key, 'type:', typeof value)
      if ((key.startsWith('file_') || key === 'file') && value instanceof File) {
        const file = value as File
        console.log('Uploading file:', file.name, 'size:', file.size)
        
        // Generate safe filename
        const safeFileName = getSafeFileName(file)
        const filePath = folder ? `${folder}/${safeFileName}` : safeFileName

        // Upload to Supabase Storage
        const { data, error } = await admin.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          continue // Skip this file and continue with others
        }

        // Get public URL
        const { data: urlData } = admin.storage
          .from(bucket)
          .getPublicUrl(filePath)

        uploadedUrls.push({
          url: urlData.publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('image/') ? 'image' : 'other'
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      urls: uploadedUrls,
      count: uploadedUrls.length 
    })

  } catch (error: any) {
    console.error('Bulk upload API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSafeFileName } from "@/helpers/nameSenitizer"

/**
 * ULTRA BULK UPLOAD API
 * 
 * This endpoint handles ALL file uploads in a single request.
 * Maximum efficiency - one API call for all files across all buckets.
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
    const totalFiles = parseInt(String(formData.get('totalFiles') || '0'))

    console.log('Ultra bulk upload API called with', totalFiles, 'files')

    const uploadedUrls: { url: string; type: string; originalFile: File }[] = []
    const bucketCache = new Set<string>()

    // Process all files in parallel
    const uploadPromises = []
    
    for (let i = 0; i < totalFiles; i++) {
      const file = formData.get(`file_${i}`) as File
      const bucket = String(formData.get(`bucket_${i}`) || 'day-media')
      const folder = String(formData.get(`folder_${i}`) || '')
      
      if (file) {
        uploadPromises.push(
          uploadSingleFile(admin, file, bucket, folder, bucketCache)
        )
      }
    }

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises)
    
    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        uploadedUrls.push(result.value)
      } else {
        console.error(`File ${index} upload failed:`, result.status === 'rejected' ? result.reason : 'Unknown error')
      }
    })

    console.log('Ultra bulk upload completed:', uploadedUrls.length, 'files uploaded successfully')

    return NextResponse.json({ 
      success: true, 
      urls: uploadedUrls,
      count: uploadedUrls.length,
      total: totalFiles
    })

  } catch (error: any) {
    console.error('Ultra bulk upload API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 })
  }
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadSingleFile(
  admin: any,
  file: File,
  bucket: string,
  folder: string,
  bucketCache: Set<string>
): Promise<{ url: string; type: string; originalFile: File } | null> {
  try {
    // Ensure bucket exists (cache to avoid repeated calls)
    if (!bucketCache.has(bucket)) {
      await admin.storage.createBucket(bucket, { public: true }).catch(() => {})
      bucketCache.add(bucket)
    }

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
      return null
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      type: file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('image/') ? 'image' : 'other',
      originalFile: file
    }
  } catch (error) {
    console.error(`Error uploading ${file.name}:`, error)
    return null
  }
}

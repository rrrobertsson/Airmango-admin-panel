import { createBrowserClient } from "@supabase/ssr"
import { getSafeFileName } from "@/helpers/nameSenitizer"


// Initialize Supabase client for direct storage access
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache auth status to avoid repeated user API calls per file
let cachedUser: any | null = null
let authCheckInFlight: Promise<any> | null = null
async function ensureAuthenticated(): Promise<any> {
  if (cachedUser) return cachedUser
  if (authCheckInFlight) return authCheckInFlight
  authCheckInFlight = supabase.auth.getUser().then(({ data: { user }, error }) => {
    authCheckInFlight = null
    if (error || !user) {
      throw new Error('User must be authenticated to upload files')
    }
    cachedUser = user
    return user
  })
  return authCheckInFlight
}

/**
 * Upload a single file directly to Supabase Storage
 */
export async function uploadFileToStorage(
  file: File, 
  bucket: string, 
  folder?: string,
  options?: { skipAuth?: boolean }
): Promise<{ url: string; type: string }> {
  try {
    // One-time auth check (can be skipped when already ensured by caller)
    if (!options?.skipAuth) {
      await ensureAuthenticated()
    }

    // Generate safe, unique filename
    const safeFileName = getSafeFileName(file)
    const filePath = folder ? `${folder}/${safeFileName}` : safeFileName
    
    // Upload file directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      // If direct upload fails, try the fallback API
      throw new Error(`DIRECT_UPLOAD_FAILED: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      type: file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('image/') ? 'image' : 'other'
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    
    // If it's a direct upload failure, try API fallback
    if (error.message?.includes('DIRECT_UPLOAD_FAILED')) {
      console.log('Trying API fallback for:', file.name)
      return uploadSingleFileViaAPI(file, bucket, folder)
    }
    
    throw new Error(`Upload failed for ${file.name}: ${error}`)
  }
}

/**
 * Fallback: Upload single file through API
 */
async function uploadSingleFileViaAPI(
  file: File, 
  bucket: string, 
  folder?: string
): Promise<{ url: string; type: string }> {
  try {
    console.log('Using API fallback for:', file.name, 'bucket:', bucket, 'folder:', folder)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    if (folder) formData.append('folder', folder)
    
    const response = await fetch('/api/upload-bulk', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API upload failed:', response.status, errorText)
      throw new Error(`API upload failed: ${response.status} ${errorText}`)
    }
    
    const result = await response.json()
    console.log('API upload result:', result)
    
    if (result.urls && result.urls.length > 0) {
      return result.urls[0]
    }
    
    throw new Error('No URLs returned from API')
  } catch (error) {
    console.error('API fallback error:', error)
    throw new Error(`API fallback failed: ${error}`)
  }
}

/**
 * Upload multiple files in parallel to Supabase Storage
 */
export async function uploadFilesBulk(
  files: File[], 
  bucket: string, 
  folder?: string
): Promise<{ url: string; type: string }[]> {
  try {
    // Ensure auth ONCE for the whole batch
    await ensureAuthenticated()
    // Try direct upload first for all files
    const uploadPromises = files.map(file => 
      uploadFileToStorage(file, bucket, folder, { skipAuth: true })
    )
    
    const results = await Promise.all(uploadPromises)
    return results
  } catch (error) {
    console.error('Bulk upload failed, trying API fallback:', error)
    // Fallback: try uploading through API if direct storage fails
    return uploadFilesViaAPI(files, bucket, folder)
  }
}

/**
 * ULTRA-OPTIMIZED: Upload ALL files in a single API call
 * This is the most efficient approach - one API call for all files
 */
export async function uploadAllFilesUltraBulk(
  allFiles: { file: File; bucket: string; folder?: string }[]
): Promise<{ url: string; type: string; originalFile: File }[]> {
  try {
    console.log('Using direct upload for', allFiles.length, 'files');
    
    // Ensure auth once to avoid repeated user API calls
    await ensureAuthenticated()
    
    // Try direct upload first for all files
    const uploadPromises = allFiles.map(fileData => 
      uploadFileToStorage(fileData.file, fileData.bucket, fileData.folder, { skipAuth: true })
        .then(result => ({
          ...result,
          originalFile: fileData.file
        }))
        .catch(error => {
          console.error(`Direct upload failed for ${fileData.file.name}:`, error);
          // Fallback to API for this specific file
          return uploadSingleFileViaAPI(fileData.file, fileData.bucket, fileData.folder)
            .then(apiResult => ({
              ...apiResult,
              originalFile: fileData.file
            }));
        })
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('All upload methods failed:', error);
    throw new Error(`Upload failed: ${error}`);
  }
}

/**
 * Fallback: Upload files through API if direct storage fails
 */
async function uploadFilesViaAPI(
  files: File[], 
  bucket: string, 
  folder?: string
): Promise<{ url: string; type: string }[]> {
  try {
    const formData = new FormData()
    
    // Add files to form data
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file)
    })
    
    // Add metadata
    formData.append('bucket', bucket)
    if (folder) formData.append('folder', folder)
    
    const response = await fetch('/api/upload-bulk', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`API upload failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.urls || []
  } catch (error) {
    throw new Error(`Fallback upload failed: ${error}`)
  }
}

/**
 * Upload trip cover image
 */
export async function uploadTripCover(file: File): Promise<string> {
  await ensureAuthenticated()
  const result = await uploadFileToStorage(file, 'trip-covers', undefined, { skipAuth: true })
  return result.url
}

/**
 * Upload day media files
 */
export async function uploadDayMedia(files: File[]): Promise<{ url: string; type: string }[]> {
  return uploadFilesBulk(files, 'day-media', 'days')
}

/**
 * Upload attraction media files
 */
export async function uploadAttractionMedia(files: File[]): Promise<{ url: string; type: string }[]> {
  return uploadFilesBulk(files, 'day-media', 'attractions')
}

/**
 * Upload accommodation media files
 */
export async function uploadAccommodationMedia(files: File[]): Promise<{ url: string; type: string }[]> {
  return uploadFilesBulk(files, 'day-media', 'accommodations')
}

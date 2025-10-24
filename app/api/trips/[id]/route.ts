import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { log } from "console"
import { getSafeFileName } from "@/helpers/nameSenitizer"

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Create admin client for file operations
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // ========================================
    // STEP 1: FETCH ALL DATA IN PARALLEL
    // ========================================
    const [
      { data: days, error: daysError },
      { data: trip, error: tripErr }
    ] = await Promise.all([
      supabase.from("days").select("id").eq("trip_id", id),
      supabase.from('trips').select('cover_image').eq('id', id).maybeSingle()
    ])

    if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 })
    if (tripErr) return NextResponse.json({ error: tripErr.message }, { status: 500 })

    const dayIds = (days || []).map((d: any) => d.id)

    // ========================================
    // STEP 2: FETCH MEDIA (only if days exist)
    // ========================================
    let allMedia: Array<{ media_url: string }> = []
    if (dayIds.length > 0) {
      const { data: media, error: mediaError } = await supabase
        .from("day_media")
        .select("media_url")
        .in("day_id", dayIds)
      
      if (mediaError) return NextResponse.json({ error: mediaError.message }, { status: 500 })
      allMedia = media || []
    }

    // ========================================
    // STEP 3: DELETE STORAGE FILES IN PARALLEL
    // ========================================
    const extractStoragePath = (url: string, bucket: string): string | null => {
      if (!url || typeof url !== 'string') return null
      
      // Handle potential JSON string
      let actualUrl = url
      if (url.startsWith('{')) {
        try {
          const parsed = JSON.parse(url)
          actualUrl = parsed?.url || url
        } catch {}
      }
      
      // Extract path after bucket name
      const match = actualUrl.match(new RegExp(`${bucket}/(.*)$`))
      return match ? match[1] : null
    }

    // Collect all file paths to delete
    const dayMediaPaths: string[] = []
    const coverPaths: string[] = []

    // Process day media
    for (const m of allMedia) {
      const path = extractStoragePath(m.media_url, 'day-media')
      if (path) dayMediaPaths.push(path)
    }

    // Process cover image
    if (trip?.cover_image) {
      const path = extractStoragePath(trip.cover_image, 'trip-covers')
      if (path) coverPaths.push(path)
    }

    // Delete all files in parallel (Supabase allows up to 100 files per batch)
    const storageDeletes = []
    
    // Batch delete day-media files (100 at a time)
    for (let i = 0; i < dayMediaPaths.length; i += 100) {
      const batch = dayMediaPaths.slice(i, i + 100)
      storageDeletes.push(
        admin.storage.from('day-media').remove(batch).catch(err => 
          console.error('Error deleting day-media batch:', err)
        )
      )
    }
    
    // Delete cover image
    if (coverPaths.length > 0) {
      storageDeletes.push(
        admin.storage.from('trip-covers').remove(coverPaths).catch(err => 
          console.error('Error deleting cover:', err)
        )
      )
    }

    // Execute all storage deletions in parallel
    await Promise.allSettled(storageDeletes)

    // ========================================
    // STEP 4: DELETE DATABASE ROWS IN PARALLEL
    // ========================================
    if (dayIds.length > 0) {
      // Delete all related records in parallel
      await Promise.allSettled([
        supabase.from('day_media').delete().in('day_id', dayIds),
        supabase.from('activities').delete().in('day_id', dayIds),
        supabase.from('attractions').delete().in('day_id', dayIds),
        supabase.from('accommodations').delete().in('day_id', dayIds),
        supabase.from('days').delete().in('id', dayIds)
      ])
    }

    // Finally delete the trip itself
    const { error: deleteTripError } = await supabase.from('trips').delete().eq('id', id)
    if (deleteTripError) {
      return NextResponse.json({ error: deleteTripError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to delete trip and media' 
    }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabaseUser = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let payload: any;
  let cover_url: string | undefined;

  if (isJson) {
    payload = await req.json();
    cover_url = payload.cover_image || payload.cover_url || undefined;
  } else {
    const form = await req.formData();
    payload = JSON.parse(String(form.get("payload") || "{}"));
    const file = form.get("cover") as File | null;
    cover_url = payload.cover_image;
    if (file && file.size > 0) {
      const bucket = "trip-covers";
      await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
      const path = getSafeFileName(file);
      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError)
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
      cover_url = pub.publicUrl;
    }
  }

  const supabase = await getSupabaseServerClient();

  try {
    payload.cover_image = cover_url;

    const { error, data } = await supabase.rpc("update_trip_with_relations", {
      trip_id_param: id,
      payload,
    });

    if (error) throw new Error(error.message);

    // ✅ Delete media from Supabase Storage
    if (data?.deleted_media_urls?.length) {
      const paths = data.deleted_media_urls
        .map((url: string) => {
          const splitPoint = url.split("/storage/v1/object/public/")[1];
          return splitPoint?.split("/").slice(1).join("/") || null;
        })
        .filter(Boolean);

      if (paths.length > 0) {
        await admin.storage.from("day-media").remove(paths);
      }
    }

    return NextResponse.json({ success: true, trip_id: id });
  } catch (error: any) {
    console.error("Trip update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

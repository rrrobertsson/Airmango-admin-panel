import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import type { Trip } from "@/types/trip"
import { getSafeFileName } from "@/helpers/nameSenitizer"

export async function GET() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // First, get trips with days, activities, attractions, accommodations
  const { data: tripsData, error: tripsError } = await supabase
    .from("trips")
    .select(`
      *,
      days (
        *,
        activities (*),
        attractions (*),
        accommodations (*),
        feature_media:days_feature_media_id_fkey (*)
      )
    `)
    .order("created_at", { ascending: false })
    
  if (tripsError)
    return NextResponse.json({ error: tripsError.message }, { status: 500 })

  // Then, for each day, fetch its media separately
  if (tripsData) {
    for (const trip of tripsData) {
      if (trip.days) {
        // Sort days by order_index to maintain proper order
        trip.days.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        
        for (const day of trip.days) {
          const { data: dayMedia } = await supabase
            .from("day_media")
            .select("*")
            .eq("day_id", day.id)
          
          day.day_media = dayMedia || []
        }
      }
    }
  }

  return NextResponse.json({ trips: tripsData ?? [] })
}


// Helper function to create day media records efficiently
const insertDayMedia = (urls: { url: string; type: string }[], related_to: string, ids: { day_id: string; activity_id?: string; attraction_id?: string; accommodation_id?: string }) => {
  return urls.map((m) => ({
    day_id: ids.day_id,
    media_url: m.url,
    media_type: m.type,
    related_to,
    activity_id: related_to === "activity" ? ids.activity_id : null,
    attraction_id: related_to === "attraction" ? ids.attraction_id : null,
    accommodation_id: related_to === "accommodation" ? ids.accommodation_id : null,
  }));
};

export async function POST(req: Request) {
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

  // Support both JSON (preferred) and multipart forms for backward compatibility
  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let payload: any;
  let form: FormData | null = null;

  if (isJson) {
    payload = await req.json();
  } else {
    form = await req.formData();
    payload = JSON.parse(String(form.get("payload") || "{}"));
  }

  // Track all uploaded files (client ensures files are uploaded before)
  // Attach uploaded paths if you need for cleanup (should be included by client in JSON for full safety)
  let uploadedFiles: string[] = (payload.uploadedFiles || []);

  try {
    // Calls the atomic Postgres RPC to create everything transactionally
    const { error, data } = await supabaseUser.rpc(
      "create_trip_with_relations",
      { payload }
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ trip_id: data?.trip_id || null });
  } catch (error: any) {
    console.error("Trip creation failed:", error);
    // Cleanup: Delete uploaded files from storage
    try {
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log("Cleaning up uploaded files (atomic rollback phase):", uploadedFiles);
        for (const filePath of uploadedFiles) {
          try {
          await admin.storage.from("day-media").remove([filePath]);
        } catch (fileError) {
          try {
            await admin.storage.from("trip-covers").remove([filePath]);
          } catch (coverError) {
            console.error("Failed to delete uploaded file from both buckets:", filePath, fileError);
            }
          }
        }
      }
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


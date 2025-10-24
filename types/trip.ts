export type Activity = {
  id?: string
  title: string
  description?: string
  media?: string[]
  newMedia?: File[]
}
export type AttractionOrAccommodation = {
  id?: string
  title: string
  description?: string
  media?: string[]
  newMedia?: File[]
}

export type Day = {
  id?: string
  title: string
  description?: string
  activities?: Activity[]
  attractions?: AttractionOrAccommodation[]
  accommodations?: AttractionOrAccommodation[]
  media?: File[]
  featureMediaId?: string | null
  featureMediaIndex?: number | null
}

export type Trip = {
  id?: string
  title: string
  description?: string
  cover_url?: string
  days?: Day[]
  created_at?: string
  cover_image?: string
  user_id?: string
}

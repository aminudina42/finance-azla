import { createClient } from "@supabase/supabase-js"
import { ImageResponse } from 'next/og'
import { CATAT_KELUARGA_LOGO_DATA_URI } from '@/lib/brand-logo'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function AppleIcon() {
  let bg = '#ffffff'
  let image = CATAT_KELUARGA_LOGO_DATA_URI

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["website_logo_type", "website_logo_emoji", "website_logo_bg", "website_logo_image"])
    
    if (data && data.length > 0) {
      const settings = new Map(data.map(item => [item.key, item.value]))
      const fetchedType = settings.get("website_logo_type")
      if (fetchedType === 'image' && settings.get("website_logo_image")) {
        image = settings.get("website_logo_image") || CATAT_KELUARGA_LOGO_DATA_URI
        bg = settings.get("website_logo_bg") || '#ffffff'
      }
    }
  } catch (e) {
    console.error("Error fetching apple-icon settings:", e)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg || '#ffffff',
          borderRadius: '120px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt="Catat Keluarga Logo"
          style={{
            width: '90%',
            height: '90%',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    { ...size }
  )
}

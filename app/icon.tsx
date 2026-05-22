import { createClient } from "@supabase/supabase-js"
import { ImageResponse } from 'next/og'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function Icon() {
  let type = 'emoji'
  let emoji = '💳'
  let bg = 'linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)'
  let image = ''

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["website_logo_type", "website_logo_emoji", "website_logo_bg", "website_logo_image"])
    
    if (data) {
      const settings = new Map(data.map(item => [item.key, item.value]))
      type = settings.get("website_logo_type") || 'emoji'
      emoji = settings.get("website_logo_emoji") || '💳'
      bg = settings.get("website_logo_bg") || 'linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)'
      image = settings.get("website_logo_image") || ''
    }
  } catch (e) {
    console.error("Error fetching icon settings:", e)
  }

  if (type === 'image' && image) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bg || 'linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)',
            borderRadius: '120px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Logo"
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

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 260,
          background: bg,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '120px',
        }}
      >
        {emoji}
      </div>
    ),
    { ...size }
  )
}

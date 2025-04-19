import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Buffer } from 'buffer'

export async function POST(request: Request) {
  // Authenticate user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse prompt
  const { prompt } = await request.json()
  const sanitizedPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 1000) : ''
  if (!sanitizedPrompt) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }

  // Prepare Gemini API call
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY')
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`
  const payload = {
    contents: [{ parts: [{ text: sanitizedPrompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Image generation error:', errText)
      return NextResponse.json({ error: 'Image generation failed' }, { status: res.status })
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData?.data)
    const imageBase64 = imagePart?.inlineData?.data
    if (!imageBase64) {
      console.error('No image part in response', data)
      return NextResponse.json({ error: 'No image returned' }, { status: 500 })
    }

    // Upload image to Supabase storage
    const buffer = Buffer.from(imageBase64, 'base64')
    const filePath = `${user.id}/${Date.now()}.png`
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, buffer, { contentType: 'image/png' })
    if (uploadError) {
      console.error('Supabase upload error:', uploadError.message)
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
    }

    // Return public URL
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
    return NextResponse.json({ imageUrl: publicUrl })
  } catch (err) {
    console.error('Fetch error:', err)
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }
}
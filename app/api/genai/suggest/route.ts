import { NextResponse } from 'next/server'

// Remove broken GenAI client usage, use direct REST call
// export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(request: Request) {
  const { message } = await request.json()
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY')
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`
  const payload = {
    system_instruction: { parts: [{ text: 'You are a helpful assistant. Provide a concise reply to the user message. RESPOND IN PLAIN TEXT DONT USE MARKDOWN' }] },
    contents: [{ parts: [{ text: message }] }]
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Google API error:', errText)
      return NextResponse.json({ error: 'AI suggestion failed' }, { status: res.status })
    }
    const data = await res.json()
    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('Fetch error:', err)
    return NextResponse.json({ error: 'AI suggestion failed' }, { status: 500 })
  }
} 
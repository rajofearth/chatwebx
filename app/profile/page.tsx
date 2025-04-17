'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState({ name: '', email: '', profile_picture: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      // Get authenticated user
      const authRes = await supabase.auth.getUser()
      const user = authRes.data.user
      if (authRes.error || !user) {
        console.error('No authenticated user')
        setLoading(false)
        return
      }
      // Fetch profile
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, profile_picture')
        .eq('user_id', user.id)
        .single()
      if (error) {
        console.error('Error loading profile:', error)
      } else if (data) {
        setProfile({ name: data.name || '', email: data.email || '', profile_picture: data.profile_picture || '' })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    // Get authenticated user before update
    const authRes = await supabase.auth.getUser()
    const user = authRes.data.user
    if (authRes.error || !user) {
      setMessage('Not authenticated')
      setUpdating(false)
      return
    }
    const user_id = user.id
    let profile_picture_url = profile.profile_picture
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${user_id}/${Date.now()}.${fileExt}`
      // Upload avatar file and log response
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type })
      console.log('Avatar uploadData:', uploadData)
      console.error('Avatar uploadError:', uploadError)
      if (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        setMessage('Avatar upload failed — check bucket name/spaces')
        setUpdating(false)
        return
      }
      // Get public URL for uploaded avatar
      const publicUrlData = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      profile_picture_url = publicUrlData.data.publicUrl
    }
    const { error } = await supabase
      .from('profiles')
      .update({ name: profile.name, email: profile.email, profile_picture: profile_picture_url })
      .eq('user_id', user_id)
    if (error) {
      setMessage('Update failed')
    } else {
      setMessage('Profile updated!')
    }
    setTimeout(() => setMessage(''), 3000)
    setUpdating(false)
  }

  if (loading) return <div>Loading profile...</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Avatar</label>
          {profile.profile_picture && <img src={profile.profile_picture} alt="avatar" className="w-24 h-24 rounded-full mb-2" />}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            className="mt-1 block w-full border rounded p-2"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-1 block w-full border rounded p-2"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={updating}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          {updating ? 'Updating...' : 'Save'}
        </button>
      </form>
      {message && <div className="mt-4 text-sm text-green-600">{message}</div>}
    </div>
  )
} 
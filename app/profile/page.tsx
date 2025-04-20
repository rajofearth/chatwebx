'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NavMenu } from '@/components/nav-menu'
import { Camera, User, Mail, Loader2, Pencil } from 'lucide-react'
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState({ name: '', email: '', profile_picture: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
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

  // Handle file selection and create preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
      // Upload new avatar
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${user_id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type })
      
      if (uploadError) {
        console.error('Avatar uploadError:', uploadError)
        setMessage(`Avatar upload failed: ${JSON.stringify(uploadError)}`)
        setUpdating(false)
        return
      }
      
      // Get new public URL
      const publicUrlData = supabase.storage.from('avatar').getPublicUrl(filePath)
      if (!publicUrlData.data.publicUrl) {
        setMessage('Could not retrieve avatar URL')
        setUpdating(false)
        return
      }
      profile_picture_url = publicUrlData.data.publicUrl

      // Delete old avatar file if present
      if (profile.profile_picture) {
        const oldPath = profile.profile_picture.split('/avatar/')[1]
        const { error: removeError } = await supabase.storage.from('avatar').remove([oldPath])
        if (removeError) console.error('Error removing old avatar:', removeError)
      }
    }
    const { error } = await supabase
      .from('profiles')
      .update({ name: profile.name, profile_picture: profile_picture_url })
      .eq('user_id', user_id)
    if (error) {
      setMessage('Update failed')
    } else {
      setMessage('Profile updated!')
      // Clear preview after successful upload
      setAvatarPreview(null)
    }
    setTimeout(() => setMessage(''), 3000)
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavMenu />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavMenu />
      
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">My Profile</h1>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="profile" className="flex-1 py-3 sm:py-2">Profile Information</TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1 py-3 sm:py-2">Preferences</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Avatar Card */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Profile Photo</CardTitle>
                    <CardDescription>Upload a profile picture</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center">
                    <div className="relative mb-4 group">
                      {avatarPreview ? (
                        // Show preview image if available
                        <img 
                          src={avatarPreview} 
                          alt="Preview" 
                          className="w-36 h-36 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-background shadow-md"
                        />
                      ) : profile.profile_picture ? (
                        <img 
                          src={profile.profile_picture} 
                          alt={profile.name || "Profile"} 
                          className="w-36 h-36 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-background shadow-md"
                        />
                      ) : (
                        <div className="w-36 h-36 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Overlay on hover with pencil icon */}
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full sm:opacity-0 sm:group-hover:opacity-100 opacity-30 transition-opacity cursor-pointer"
                      >
                        <Pencil className="h-8 w-8 sm:h-6 sm:w-6 text-white" />
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                    
                    {avatarFile && (
                      <p className="text-sm text-primary mt-2 text-center">
                        {avatarPreview ? 'Click Save Changes to upload' : 'Processing...'}
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Profile Info Card */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your profile details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <Input
                            id="name"
                            className="rounded-l-none"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <span className="flex-1 px-3 py-2 rounded-r-md border border-input bg-muted-foreground/5 text-foreground">
                            {profile.email}
                          </span>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div>
                      {message && (
                        <p className={message.includes('fail') ? "text-destructive text-sm" : "text-green-500 text-sm"}>
                          {message}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      form="profile-form"
                      disabled={updating}
                      className="py-6 px-5 sm:py-2 sm:px-4 text-base sm:text-sm"
                    >
                      {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {updating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Account Preferences</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    This section will include notification settings, privacy controls, and other account preferences
                    when backend functionality is implemented.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 
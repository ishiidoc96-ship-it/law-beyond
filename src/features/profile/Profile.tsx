import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { uploadAvatar, isCloudinaryConfigured } from '../../lib/cloudinary'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../lib/notify'
import { toast } from 'sonner'

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [course, setCourse] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

  const startEditing = () => {
    setFullName(profile?.full_name || '')
    setUniversity(profile?.university || '')
    setCourse(profile?.course || '')
    setYearOfStudy(profile?.year_of_study || '')
    setEditing(true)
    setSaveMsg('')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!isCloudinaryConfigured) {
      setSaveMsg('Cloudinary not configured')
      return
    }
    setUploadingAvatar(true)
    try {
      const result = await uploadAvatar(file)
      await updateProfile({ avatar_url: result.secure_url })
      setSaveMsg('Profile photo updated!')
    } catch {
      setSaveMsg('Failed to upload photo')
    }
    setUploadingAvatar(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaveMsg('')
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      university: university.trim(),
      course: course.trim(),
      year_of_study: yearOfStudy.trim(),
    })
    if (error) {
      setSaveMsg('Failed to save profile')
    } else {
      setSaveMsg('Profile updated!')
      setEditing(false)
    }
    setSaving(false)
  }

  const handlePushToggle = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(user!.uid)
        setPushEnabled(false)
        toast.success('Push notifications disabled')
      } else {
        const granted = await requestNotificationPermission()
        if (granted) {
          await subscribeToPush(user!.uid)
          setPushEnabled(true)
          toast.success('Push notifications enabled')
        } else {
          toast.error('Notification permission denied')
        }
      }
    } catch {
      toast.error('Failed to update push settings')
    }
    setPushLoading(false)
  }

  const themes = [
    { value: 'light' as const, label: 'Light', icon: 'light_mode' },
    { value: 'dark' as const, label: 'Dark', icon: 'dark_mode' },
    { value: 'black' as const, label: 'AMOLED', icon: 'contrast' },
    { value: 'white' as const, label: 'White', icon: 'brightness_high' },
  ]

  return (
    <main className="pt-[80px] pb-[100px] px-4 md:px-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-headline-lg text-[28px] md:text-[32px] leading-tight tracking-[-0.02em] font-bold text-on-surface">Profile</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Manage your account settings.</p>
      </div>

      {/* Avatar Section */}
      <section className="mb-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-3xl font-bold shadow-brand-lg overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (user?.displayName || 'U')[0].toUpperCase()
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-brand-sm hover:scale-110 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[16px]">{uploadingAvatar ? 'progress_activity' : 'camera_alt'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface">{profile?.full_name || user?.displayName || 'User'}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{user?.email}</p>
      </section>

      {/* Profile Info */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Personal Info</h4>
          {!editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold hover:bg-primary/20 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="bg-surface rounded-2xl border border-outline-variant/30 p-5 flex flex-col gap-4">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">University</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Course</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Year of Study</label>
              <input
                type="text"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold border border-outline-variant/30 hover:bg-surface-container-high transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-brand-md hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saveMsg && (
              <p className={`text-sm text-center ${saveMsg.includes('Failed') ? 'text-error' : 'text-primary'}`}>{saveMsg}</p>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-outline-variant/30 divide-y divide-outline-variant/20">
            {[
              { label: 'Full Name', value: profile?.full_name || 'Not set', icon: 'person' },
              { label: 'University', value: profile?.university || 'Not set', icon: 'school' },
              { label: 'Course', value: profile?.course || 'Not set', icon: 'menu_book' },
              { label: 'Year', value: profile?.year_of_study || 'Not set', icon: 'calendar_today' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-5 py-4">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/60">{item.icon}</span>
                <div className="flex-1">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{item.label}</p>
                  <p className="font-body-md text-body-md text-on-surface">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="mb-6">
        <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Appearance</h4>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                theme === t.value
                  ? 'bg-primary/10 border-primary/30 shadow-brand-sm'
                  : 'bg-surface border-outline-variant/30 hover:bg-surface-container-high'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${theme === t.value ? 'text-primary' : 'text-on-surface-variant'}`}>
                {t.icon}
              </span>
              <span className={`font-body-md text-body-md ${theme === t.value ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Push Notifications */}
      <section className="mb-6">
        <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Notifications</h4>
        <button
          onClick={handlePushToggle}
          disabled={pushLoading}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface border border-outline-variant/30 card-hover"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushEnabled ? 'bg-primary/10' : 'bg-surface-container-high'}`}>
            <span className={`material-symbols-outlined text-[20px] ${pushEnabled ? 'text-primary' : 'text-on-surface-variant'}`}>
              {pushEnabled ? 'notifications_active' : 'notifications_off'}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="font-body-md text-body-md text-on-surface font-medium">Push Notifications</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{pushEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div className={`w-12 h-7 rounded-full flex items-center transition-all ${pushEnabled ? 'bg-primary justify-end' : 'bg-surface-container-high justify-start'}`}>
            <div className={`w-5 h-5 rounded-full mx-1 transition-all ${pushEnabled ? 'bg-on-primary' : 'bg-on-surface-variant/60'}`} />
          </div>
        </button>
      </section>

      {/* Sign Out */}
      <section className="mb-6">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-error-container/20 text-error font-semibold hover:bg-error-container/30 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </button>
      </section>

      <p className="text-center font-body-sm text-body-sm text-on-surface-variant/40 pb-4">Law Beyond v1.0.0</p>
    </main>
  )
}

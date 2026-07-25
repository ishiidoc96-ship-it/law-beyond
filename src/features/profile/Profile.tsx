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
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await updateProfile({
      full_name: fullName,
      university,
      course,
      year_of_study: yearOfStudy,
    })
    setSaving(false)
    if (error) {
      setSaveMsg('Error saving profile')
    } else {
      setSaveMsg('Profile saved!')
      setEditing(false)
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const togglePush = async () => {
    if (!user) return
    setPushLoading(true)
    if (pushEnabled) {
      await unsubscribeFromPush(user.id)
      setPushEnabled(false)
      toast.success('Notifications disabled')
    } else {
      const granted = await requestNotificationPermission()
      if (granted === 'granted') {
        const ok = await subscribeToPush(user.id)
        setPushEnabled(ok)
        if (ok) toast.success('Notifications enabled! You\'ll receive streak reminders.')
        else toast.error('Failed to enable notifications')
      } else if (granted === 'denied') {
        toast.error('Notifications blocked. Enable them in your browser settings.')
      } else {
        toast.error('Permission not granted')
      }
    }
    setPushLoading(false)
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-6 md:mt-8 pb-24 animate-fade-up">
      <section className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-28 h-28 rounded-full object-cover border-4 border-outline-variant/30"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary-container flex items-center justify-center">
              <span className="font-headline-lg text-headline-lg text-on-primary-container font-bold">{initials}</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            aria-label="Change profile photo"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-surface border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shadow-sm active:scale-95 disabled:opacity-50"
          >
            {uploadingAvatar ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            )}
          </button>
        </div>
        <div>
          <h1 className="font-headline-lg text-[28px] leading-tight tracking-[-0.02em] font-bold text-on-surface mb-1">{displayName}</h1>
          {profile?.university && (
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">school</span>
              {profile.university}
            </p>
          )}
          {profile?.course && (
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">book</span>
              {profile.course}{profile.year_of_study ? ` · Year ${profile.year_of_study}` : ''}
            </p>
          )}
          {!profile?.university && !profile?.course && (
            <p className="font-body-md text-body-md text-on-surface-variant">{profile?.email || user?.email}</p>
          )}
        </div>
      </section>

      {editing && (
        <section className="bg-surface border border-outline-variant/50 rounded-3xl p-6 flex flex-col gap-4 shadow-ambient">
          <h3 className="font-headline-md text-headline-md text-on-surface">Edit Profile</h3>
          <div className="flex flex-col gap-3">
            {[
              { value: fullName, onChange: setFullName, placeholder: 'Full Name' },
              { value: university, onChange: setUniversity, placeholder: 'University' },
              { value: course, onChange: setCourse, placeholder: 'Course (e.g. LLB Law)' },
              { value: yearOfStudy, onChange: setYearOfStudy, placeholder: 'Year of Study' },
            ].map((field, i) => (
              <input
                key={i}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-body-md text-body-md bg-surface-container-low text-on-surface transition-all"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            ))}
          </div>
          {saveMsg && <p className={`font-label-sm text-label-sm ${saveMsg.includes('Error') ? 'text-error' : 'text-primary'}`}>{saveMsg}</p>}
          <div className="flex gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:shadow-brand-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setSaveMsg('') }}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-all"
            >
              Cancel
            </button>
        </div>
        <button
          onClick={startEditing}
          className="text-primary font-label-md text-label-md font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-3 py-1"
        >
          Edit Profile
        </button>
      </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: 'bolt', value: '—', label: 'Days Active' },
          { icon: 'local_fire_department', value: '—', label: 'Day Streak' },
          { icon: 'task_alt', value: '—', label: 'Tasks Done' },
          { icon: 'menu_book', value: '—', label: 'Journal Entries' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-outline-variant/50 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-ambient transition-all btn-press">
            <span className="material-symbols-outlined text-primary mb-2 text-[24px]">{stat.icon}</span>
            <span className="font-headline-md text-headline-md text-on-surface">{stat.value}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="mt-2">
        <h2 className="font-label-sm text-[11px] leading-[16px] font-bold tracking-[0.08em] text-on-surface-variant uppercase mb-3 px-1">Settings</h2>
        <div className="bg-surface border border-outline-variant/50 rounded-2xl overflow-hidden flex flex-col">
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">{pushEnabled ? 'notifications_active' : 'notifications_off'}</span>
              </div>
              <div className="text-left">
                <span className="font-body-md text-body-md text-on-surface font-medium block">Push Notifications</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{pushEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
              <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${pushEnabled ? 'bg-primary justify-end' : 'bg-outline-variant/60 justify-start'}`}>
              <div className="w-6 h-6 rounded-full bg-surface-container-lowest shadow-sm transition-all" />
            </div>
          </button>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-tertiary-container/50 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">
                  {theme === 'black' ? 'nightlight' : theme === 'dark' ? 'dark_mode' : 'light_mode'}
                </span>
              </div>
              <div>
                <span className="font-body-md text-body-md text-on-surface font-medium block">Appearance</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {theme === 'black' ? 'AMOLED Black' : theme === 'dark' ? 'Dark Mode' : theme === 'white' ? 'White Mode' : 'Light Mode'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {([
                { value: 'light' as const, icon: 'light_mode', label: 'Light' },
                { value: 'white' as const, icon: 'brightness_high', label: 'White' },
                { value: 'dark' as const, icon: 'dark_mode', label: 'Dark' },
                { value: 'black' as const, icon: 'nightlight', label: 'Black' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                    theme === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant/50 bg-surface-container-low text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                  <span className="font-label-sm text-label-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center justify-between p-4 hover:bg-error-container/30 transition-colors cursor-pointer group border-t border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-error-container/50 flex items-center justify-center text-error group-hover:bg-error group-hover:text-on-error transition-colors">
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </div>
              <span className="font-body-md text-body-md text-error font-medium">Logout</span>
            </div>
          </button>
        </div>
      </section>
    </main>
  )
}

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'future_lawyer_unsigned'

export const isCloudinaryConfigured = !!CLOUD_NAME

export type MediaType = 'image' | 'video'

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  bytes: number
  resource_type: string
  duration?: number
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env')
  }

  const isVideo = isVideoFile(file)
  const resourceType = isVideo ? 'video' : 'image'

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('resource_type', resourceType)
  if (!isVideo) {
    formData.append('quality', 'original')
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }))
    throw new Error(error.error?.message || 'Upload failed')
  }

  return response.json()
}

export async function uploadAvatar(file: File): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('resource_type', 'image')
  formData.append('quality', 'auto')
  formData.append('fetch_format', 'auto')
  formData.append('transformation', 'c_fill,g_face,w_256,h_256')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }))
    throw new Error(error.error?.message || 'Upload failed')
  }

  return response.json()
}

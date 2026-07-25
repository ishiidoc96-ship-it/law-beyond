import PocketBase from 'pocketbase'

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(PB_URL)

// Auto-refresh auth token
pb.authStore.onChange(() => {
  // Token is automatically managed by the SDK
})

export const isPocketBaseConfigured = !!PB_URL

// Helper to get the current user ID
export function getCurrentUserId(): string | null {
  return pb.authStore.record?.id || null
}

// Helper to get full file URL for a record
export function getFileUrl(_collection: string, recordId: string, filename: string, thumb?: string): string {
  return pb.files.getURL({ id: recordId, collectionId: '' } as any, filename, {
    thumb: thumb || '100x100',
  })
}

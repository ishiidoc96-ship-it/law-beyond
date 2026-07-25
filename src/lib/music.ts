// Real music search using iTunes Search API (free, no auth, CORS-friendly)
// Returns 30-second previews that play directly in the app

export interface MusicTrack {
  id: string
  title: string
  artist: string
  album: string
  previewUrl: string
  artworkUrl: string
  duration: number
  genre: string
}

interface ITunesResult {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  previewUrl: string
  artworkUrl100: string
  trackTimeMillis: number
  primaryGenreName: string
}

export async function searchMusic(query: string, limit = 20): Promise<MusicTrack[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
    )
    const data = await res.json()
    if (!data.results) return []
    return data.results.map((t: ITunesResult) => ({
      id: String(t.trackId),
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      previewUrl: t.previewUrl,
      artworkUrl: t.artworkUrl100,
      duration: t.trackTimeMillis,
      genre: t.primaryGenreName,
    }))
  } catch {
    return []
  }
}

export async function searchMusicByGenre(genre: string, limit = 25): Promise<MusicTrack[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${genre}&media=music&entity=song&genre=${genre}&limit=${limit}`
    )
    const data = await res.json()
    if (!data.results) return []
    return data.results.map((t: ITunesResult) => ({
      id: String(t.trackId),
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      previewUrl: t.previewUrl,
      artworkUrl: t.artworkUrl100,
      duration: t.trackTimeMillis,
      genre: t.primaryGenreName,
    }))
  } catch {
    return []
  }
}

// Trending/popular searches by genre
export const GENRE_SEEDS = [
  { label: 'Trending', query: 'top hits 2024' },
  { label: 'Pop', query: 'pop hits' },
  { label: 'Hip-Hop', query: 'hip hop rap' },
  { label: 'R&B', query: 'r&b soul' },
  { label: 'Indie', query: 'indie alternative' },
  { label: 'Afrobeats', query: 'afrobeats' },
  { label: 'Latin', query: 'reggaeton latin' },
  { label: 'Rock', query: 'rock alternative' },
  { label: 'K-Pop', query: 'kpop k-pop' },
  { label: 'Chill', query: 'chill lo-fi' },
]

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return `${min}:${s.toString().padStart(2, '0')}`
}

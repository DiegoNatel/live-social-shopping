import { RoomServiceClient } from 'livekit-server-sdk'

// LiveKit helpers shared by the app (lib/video.ts) and the cron in worker.ts, so they take
// the env as an argument instead of reading the request's Cloudflare context.

export type LiveKitConfig = { url: string; apiKey: string; apiSecret: string }

export function liveKitConfig(env: CloudflareEnv): LiveKitConfig | null {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return null
  return { url: env.LIVEKIT_URL, apiKey: env.LIVEKIT_API_KEY, apiSecret: env.LIVEKIT_API_SECRET }
}

export const roomService = (lk: LiveKitConfig) => new RoomServiceClient(lk.url.replace(/^ws/, 'http'), lk.apiKey, lk.apiSecret)

// The host joins as host-<sellerId> (see app/api/live/[id]/video)
export const HOST_IDENTITY_PREFIX = 'host-'

// For each live, whether its host is in the video room sending video or sound.
// null when LiveKit isn't set up or didn't answer, so callers don't act on a guess.
export async function hostsBroadcasting(env: CloudflareEnv, streamIds: string[]): Promise<Map<string, boolean> | null> {
  const lk = liveKitConfig(env)
  if (!lk) return null
  const service = roomService(lk)
  try {
    const open = new Set((await service.listRooms(streamIds)).map(r => r.name))
    const entries = await Promise.all(
      streamIds.map(async id => {
        if (!open.has(id)) return [id, false] as const
        const people = await service.listParticipants(id)
        return [id, people.some(p => p.identity.startsWith(HOST_IDENTITY_PREFIX) && p.tracks.length > 0)] as const
      })
    )
    return new Map(entries)
  } catch (e) {
    console.error('LiveKit room check failed', e)
    return null
  }
}

// Closes a live's room for everyone; LiveKit then finishes and uploads the recording
export async function deleteRoom(env: CloudflareEnv, streamId: string) {
  const lk = liveKitConfig(env)
  if (!lk) return
  await roomService(lk)
    .deleteRoom(streamId)
    .catch(() => {
      // Already closed (everyone left and the room timed out)
    })
}

// Ends a live: the recording (if any) becomes its video once LiveKit finishes uploading it.
// Bind the stream id; changes() is 0 when it had already ended.
export const END_STREAM_SQL = `UPDATE streams SET status = 'ended', viewer_count = 0, video_idle_since = NULL,
    ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    video_url = CASE WHEN recording_key IS NOT NULL THEN '/' || recording_key ELSE video_url END
  WHERE id = ? AND status != 'ended'`

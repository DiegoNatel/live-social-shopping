import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  AccessToken,
  EncodedFileOutput,
  EncodedFileType,
  RoomCompositeEgressRequest,
  RoomEgress,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk'

// Live video runs on LiveKit Cloud: one LiveKit room per stream (named by stream id).
// The host publishes camera and mic from the browser; viewers only subscribe.
// Without the LIVEKIT_* secrets the app works as before and shows the stream's cover image.
//
// Recording is optional: with the RECORDINGS_S3_* secrets (an R2 API token for the
// vivobuy-images bucket), LiveKit records each live to recordings/<streamId>/<time>.mp4,
// served at the same path by app/recordings/[...key].

const RECORDING_BUCKET = 'vivobuy-images'
const TOKEN_TTL = '6h' // longest a host or viewer stays in one session without refreshing

function liveKit() {
  const env = getCloudflareContext().env
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return null
  return { url: env.LIVEKIT_URL, apiKey: env.LIVEKIT_API_KEY, apiSecret: env.LIVEKIT_API_SECRET }
}

export const videoEnabled = () => liveKit() !== null

// Token for joining a stream's video room. Only the host may publish.
export async function videoToken(streamId: string, p: { identity: string; name: string; canPublish: boolean }) {
  const lk = liveKit()
  if (!lk) return null
  const at = new AccessToken(lk.apiKey, lk.apiSecret, { identity: p.identity, name: p.name, ttl: TOKEN_TTL })
  at.addGrant({
    room: streamId,
    roomJoin: true,
    canSubscribe: true,
    canPublish: p.canPublish,
    canPublishData: false,
    // Viewers don't show up in the host's participant list
    hidden: !p.canPublish,
  })
  return { url: lk.url, token: await at.toJwt() }
}

function rooms(lk: NonNullable<ReturnType<typeof liveKit>>) {
  return new RoomServiceClient(lk.url.replace(/^ws/, 'http'), lk.apiKey, lk.apiSecret)
}

// Opens the stream's room when the host goes live, recording it when recording is set up.
// Returns the R2 key the recording will be uploaded to, or null when not recording.
export async function openVideoRoom(streamId: string): Promise<string | null> {
  const lk = liveKit()
  if (!lk) return null
  const env = getCloudflareContext().env
  const recording = env.RECORDINGS_S3_ENDPOINT && env.RECORDINGS_S3_ACCESS_KEY && env.RECORDINGS_S3_SECRET
  const key = recording ? `recordings/${streamId}/${new Date().toISOString().replace(/[:.]/g, '-')}.mp4` : null

  await rooms(lk).createRoom({
    name: streamId,
    // Keeps the room through a host's dropped connection or page reload
    emptyTimeout: 10 * 60,
    departureTimeout: 5 * 60,
    egress: key
      ? new RoomEgress({
          room: new RoomCompositeEgressRequest({
            roomName: streamId,
            layout: 'single-speaker',
            fileOutputs: [
              new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: key,
                output: {
                  case: 's3',
                  value: new S3Upload({
                    endpoint: env.RECORDINGS_S3_ENDPOINT!,
                    accessKey: env.RECORDINGS_S3_ACCESS_KEY!,
                    secret: env.RECORDINGS_S3_SECRET!,
                    bucket: RECORDING_BUCKET,
                    region: 'auto',
                    forcePathStyle: true,
                  }),
                },
              }),
            ],
          }),
        })
      : undefined,
  })
  return key
}

// Whether the host's room is open. Viewers only join an open room, so lives without a
// broadcaster (e.g. sample data) keep their cover image and don't use LiveKit minutes.
export async function videoRoomOpen(streamId: string) {
  const lk = liveKit()
  if (!lk) return false
  const found = await rooms(lk).listRooms([streamId]).catch(() => [])
  return found.length > 0
}

// Ends the room for everyone; LiveKit then finishes and uploads the recording.
// Runs after the response is sent, so a slow LiveKit API doesn't hold up the
// "live ended" message to viewers.
export function closeVideoRoom(streamId: string) {
  const lk = liveKit()
  if (!lk) return
  const done = rooms(lk)
    .deleteRoom(streamId)
    .catch(() => {
      // Already closed (everyone left and the room timed out)
    })
  getCloudflareContext().ctx.waitUntil(done)
}

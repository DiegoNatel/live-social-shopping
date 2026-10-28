'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalTracks,
  type LocalAudioTrack,
  type LocalVideoTrack,
  type RemoteTrack,
} from 'livekit-client'
import { Mic, MicOff, Video, VideoOff, SwitchCamera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveVideoProps {
  streamId: string
  isLive: boolean
  thumbnail: string
  title: string
  // A finished live's recording
  recordingUrl?: string
  muted: boolean
}

type Access = { url: string; token: string; canPublish: boolean }

// The live's video: the host's camera (broadcast to viewers) or what viewers watch.
// Falls back to the cover image when video isn't set up, the live hasn't started, or
// the host isn't sending video yet. A finished live plays its recording, if there is one.
export function LiveVideo({ streamId, isLive, thumbnail, title, recordingUrl, muted }: LiveVideoProps) {
  const [access, setAccess] = useState<Access | null>(null)

  useEffect(() => {
    if (!isLive) return setAccess(null)
    let cancelled = false
    fetch(`/api/live/${encodeURIComponent(streamId)}/video`, { cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<Partial<Access>>) : {}))
      .then((a: Partial<Access>) => {
        if (!cancelled) setAccess(a.url && a.token ? (a as Access) : null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [streamId, isLive])

  const cover = (
    <>
      {thumbnail && <Image src={thumbnail} alt={title} fill className="object-cover" priority />}
    </>
  )

  if (!isLive && recordingUrl) {
    return <video src={recordingUrl} poster={thumbnail || undefined} autoPlay loop playsInline muted={muted} className="absolute inset-0 w-full h-full object-cover" />
  }
  if (!access) return cover
  return access.canPublish ? <HostCamera access={access} cover={cover} /> : <ViewerVideo access={access} cover={cover} muted={muted} />
}

// ---------- Viewers ----------

function ViewerVideo({ access, cover, muted }: { access: Access; cover: React.ReactNode; muted: boolean }) {
  const videoEl = useRef<HTMLVideoElement>(null)
  const audioEl = useRef<HTMLAudioElement>(null)
  const roomRef = useRef<Room | null>(null)
  const [hasVideo, setHasVideo] = useState(false)

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const attach = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoEl.current) {
        track.attach(videoEl.current)
        setHasVideo(true)
      }
      if (track.kind === Track.Kind.Audio && audioEl.current) track.attach(audioEl.current)
    }
    room
      .on(RoomEvent.TrackSubscribed, attach)
      .on(RoomEvent.TrackUnsubscribed, track => {
        track.detach()
        if (track.kind === Track.Kind.Video) setHasVideo(false)
      })
    room
      .connect(access.url, access.token)
      .then(() => room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => pub.track && attach(pub.track))))
      .catch(() => {})
    return () => {
      roomRef.current = null
      room.disconnect()
    }
  }, [access])

  // Browsers only play sound after a tap; unmuting is that tap
  useEffect(() => {
    if (audioEl.current) audioEl.current.muted = muted
    if (!muted) roomRef.current?.startAudio().catch(() => {})
  }, [muted])

  return (
    <>
      {!hasVideo && cover}
      {!hasVideo && (
        <p className="absolute top-1/3 inset-x-0 text-center text-white/80 text-sm">Aguardando o apresentador ligar a câmera…</p>
      )}
      <video ref={videoEl} autoPlay playsInline muted className={cn('absolute inset-0 w-full h-full object-cover', !hasVideo && 'hidden')} />
      <audio ref={audioEl} autoPlay muted />
    </>
  )
}

// ---------- Host ----------

function HostCamera({ access, cover }: { access: Access; cover: React.ReactNode }) {
  const videoEl = useRef<HTMLVideoElement>(null)
  const roomRef = useRef<Room | null>(null)
  const tracksRef = useRef<{ video?: LocalVideoTrack; audio?: LocalAudioTrack }>({})
  const [state, setState] = useState<'starting' | 'live' | 'error'>('starting')
  const [error, setError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')

  useEffect(() => {
    const room = new Room({ dynacast: true, publishDefaults: { simulcast: true, videoCodec: 'vp8' } })
    roomRef.current = room
    let stopped = false
    ;(async () => {
      try {
        const tracks = await createLocalTracks({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { facingMode: 'user', resolution: VideoPresets.h720.resolution },
        })
        if (stopped) return tracks.forEach(t => t.stop())
        for (const t of tracks) {
          if (t.kind === Track.Kind.Video) {
            tracksRef.current.video = t as LocalVideoTrack
            if (videoEl.current) t.attach(videoEl.current)
          } else tracksRef.current.audio = t as LocalAudioTrack
        }
        await room.connect(access.url, access.token)
        for (const t of tracks) await room.localParticipant.publishTrack(t)
        if (!stopped) setState('live')
      } catch (e) {
        if (stopped) return
        setState('error')
        const name = e instanceof Error ? e.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Permita o acesso à câmera e ao microfone para transmitir.'
            : name === 'NotFoundError'
              ? 'Nenhuma câmera ou microfone encontrado neste aparelho.'
              : 'Não foi possível ligar a câmera. Recarregue a página para tentar de novo.'
        )
      }
    })()
    return () => {
      stopped = true
      roomRef.current = null
      tracksRef.current.video?.stop()
      tracksRef.current.audio?.stop()
      tracksRef.current = {}
      room.disconnect()
    }
  }, [access])

  const toggleMic = async () => {
    const audio = tracksRef.current.audio
    if (!audio) return
    if (micOn) await audio.mute()
    else await audio.unmute()
    setMicOn(!micOn)
  }

  const toggleCam = async () => {
    const video = tracksRef.current.video
    if (!video) return
    if (camOn) await video.mute()
    else await video.unmute()
    setCamOn(!camOn)
  }

  const flip = async () => {
    const next = facing === 'user' ? 'environment' : 'user'
    await tracksRef.current.video?.restartTrack({ facingMode: next, resolution: VideoPresets.h720.resolution }).catch(() => {})
    setFacing(next)
  }

  return (
    <>
      {(state !== 'live' || !camOn) && cover}
      <video
        ref={videoEl}
        autoPlay
        playsInline
        muted
        className={cn('absolute inset-0 w-full h-full object-cover', facing === 'user' && '-scale-x-100', (!camOn || state === 'error') && 'hidden')}
      />
      {state === 'error' && <p className="absolute top-1/3 inset-x-6 text-center text-white text-sm bg-black/60 rounded-lg p-3">{error}</p>}
      {state === 'live' && (
        <div className="absolute left-3 top-1/3 z-30 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          <CamButton label={micOn ? 'Desligar microfone' : 'Ligar microfone'} off={!micOn} onClick={toggleMic}>
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </CamButton>
          <CamButton label={camOn ? 'Desligar câmera' : 'Ligar câmera'} off={!camOn} onClick={toggleCam}>
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </CamButton>
          <CamButton label="Trocar câmera" onClick={flip}>
            <SwitchCamera className="w-5 h-5" />
          </CamButton>
        </div>
      )}
    </>
  )
}

function CamButton({ label, off, onClick, children }: { label: string; off?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center text-white', off ? 'bg-coral-pink' : 'bg-black/50')}
    >
      {children}
    </button>
  )
}

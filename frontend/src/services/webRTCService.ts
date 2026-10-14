import { communicationApi, ICEServerConfig } from './communicationApi'

export interface RemotePeerStream {
  peerId: string
  peerName?: string
  peerRole?: string
  stream: MediaStream
  isAudioMuted?: boolean
  isVideoMuted?: boolean
  isScreenSharing?: boolean
}

type SignalCallback = (targetId: string, signal: any) => void
type RemoteStreamCallback = (peerId: string, stream: MediaStream) => void
type PeerRemoveCallback = (peerId: string) => void

export class WebRTCService {
  private localStream: MediaStream | null = null
  private displayStream: MediaStream | null = null
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map()
  private iceServers: ICEServerConfig[] = [{ urls: ['stun:stun.l.google.com:19302'] }]
  private sendSignal: SignalCallback | null = null
  private onRemoteStream: RemoteStreamCallback | null = null
  private onPeerRemove: PeerRemoveCallback | null = null
  private isSharingScreen = false

  constructor() {
    this.loadIceServers()
  }

  private async loadIceServers() {
    try {
      const config = await communicationApi.getWebRTCConfig()
      if (config.ice_servers && config.ice_servers.length > 0) {
        this.iceServers = config.ice_servers
      }
    } catch {
      // Use fallback
    }
  }

  public setCallbacks(
    sendSignal: SignalCallback,
    onRemoteStream: RemoteStreamCallback,
    onPeerRemove: PeerRemoveCallback
  ) {
    this.sendSignal = sendSignal
    this.onRemoteStream = onRemoteStream
    this.onPeerRemove = onPeerRemove
  }

  private remoteStreams: Map<string, MediaStream> = new Map()

  public async startLocalMedia(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
      })
      this.localStream = stream

      // Immediately attach tracks to any peer connections that were already initialized
      this.peerConnections.forEach((pc) => {
        const senders = pc.getSenders()
        stream.getTracks().forEach((track) => {
          const alreadyAdded = senders.some((s) => s.track && s.track.kind === track.kind)
          if (!alreadyAdded) {
            pc.addTrack(track, stream)
          }
        })
      })

      return stream
    } catch (err: any) {
      console.warn('[WebRTC] Camera+Mic permission failed, attempting audio only:', err)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.localStream = audioStream

        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders()
          audioStream.getTracks().forEach((track) => {
            const alreadyAdded = senders.some((s) => s.track && s.track.kind === track.kind)
            if (!alreadyAdded) {
              pc.addTrack(track, audioStream)
            }
          })
        })

        return audioStream
      } catch (audioErr) {
        console.error('[WebRTC] Audio & video permission denied:', audioErr)
        return null
      }
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public toggleAudio(enabled: boolean): boolean {
    if (!this.localStream) return false
    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = enabled
    })
    return enabled
  }

  public toggleVideo(enabled: boolean): boolean {
    if (!this.localStream) return false
    const videoTracks = this.localStream.getVideoTracks()
    videoTracks.forEach((track) => {
      track.enabled = enabled
    })
    return enabled
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    })

    // Attach local media:
    // Video: active display stream if sharing, otherwise camera
    const videoTrack = this.displayStream?.getVideoTracks()[0] || this.localStream?.getVideoTracks()[0]
    // Audio: microphone from localStream
    const audioTrack = this.localStream?.getAudioTracks()[0]

    let hasAddedTracks = false
    if (audioTrack && this.localStream) {
      try {
        pc.addTrack(audioTrack, this.localStream)
        hasAddedTracks = true
      } catch (e) {
        console.warn(`[WebRTC] Failed to add audio track for ${peerId}:`, e)
      }
    }
    if (videoTrack) {
      const streamForVideo = this.displayStream || this.localStream || new MediaStream([videoTrack])
      try {
        pc.addTrack(videoTrack, streamForVideo)
        hasAddedTracks = true
      } catch (e) {
        console.warn(`[WebRTC] Failed to add video track for ${peerId}:`, e)
      }
    }

    if (!hasAddedTracks) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' })
        pc.addTransceiver('video', { direction: 'sendrecv' })
      } catch {
        // Safe fallback
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignal) {
        this.sendSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate,
        })
      }
    }

    // Remote Track handler
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0]
      if (!stream) {
        stream = this.remoteStreams.get(peerId) || new MediaStream()
        stream.addTrack(event.track)
        this.remoteStreams.set(peerId, stream)
      } else {
        this.remoteStreams.set(peerId, stream)
      }
      if (this.onRemoteStream) {
        this.onRemoteStream(peerId, stream)
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerId)
      }
    }

    this.peerConnections.set(peerId, pc)
    return pc
  }

  public async initiateOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId)
    try {
      if (pc.signalingState !== 'stable') {
        console.warn(`[WebRTC] Cannot initiate offer for ${peerId} in state ${pc.signalingState}`)
        return
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      if (this.sendSignal) {
        this.sendSignal(peerId, {
          type: 'offer',
          sdp: pc.localDescription,
        })
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for ${peerId}:`, err)
    }
  }

  public async handleSignal(peerId: string, signal: any) {
    if (!signal) return
    const pc = this.createPeerConnection(peerId)

    try {
      if (signal.type === 'offer' && signal.sdp) {
        if (pc.signalingState !== 'stable') {
          console.warn(`[WebRTC] Offer collision with ${peerId}, attempting rollback`)
          try {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)),
            ])
          } catch {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          }
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        }
        await this.drainCandidateQueue(peerId, pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        if (this.sendSignal) {
          this.sendSignal(peerId, {
            type: 'answer',
            sdp: pc.localDescription,
          })
        }
      } else if (signal.type === 'answer' && signal.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          await this.drainCandidateQueue(peerId, pc)
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          if (!this.candidateQueue.has(peerId)) {
            this.candidateQueue.set(peerId, [])
          }
          this.candidateQueue.get(peerId)!.push(signal.candidate)
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } catch (e) {
            console.warn(`[WebRTC] Failed to add ICE candidate for ${peerId}:`, e)
          }
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${peerId}:`, err)
    }
  }

  private async drainCandidateQueue(peerId: string, pc: RTCPeerConnection) {
    const queue = this.candidateQueue.get(peerId)
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand))
        } catch (e) {
          console.warn(`[WebRTC] Failed to add queued ICE candidate for ${peerId}:`, e)
        }
      }
      this.candidateQueue.delete(peerId)
    }
  }

  public async startScreenShare(onEnded?: () => void): Promise<MediaStream | null> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen sharing is not supported by your browser.')
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      this.displayStream = stream
      this.isSharingScreen = true

      const screenTrack = stream.getVideoTracks()[0]
      if (screenTrack) {
        screenTrack.onended = () => {
          this.stopScreenShare()
          if (onEnded) onEnded()
        }

        // Replace video track in all active peer connections
        this.replaceVideoTrackAcrossPeers(screenTrack)
      }

      return stream
    } catch (err: any) {
      this.isSharingScreen = false
      if (err.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission was denied.')
      }
      throw err
    }
  }

  public stopScreenShare() {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop())
      this.displayStream = null
    }
    this.isSharingScreen = false

    // Restore camera video track across peers or null if camera is off
    const cameraTrack = this.localStream?.getVideoTracks()[0] || null
    this.replaceVideoTrackAcrossPeers(cameraTrack)
  }

  public getIsSharingScreen(): boolean {
    return this.isSharingScreen
  }

  private replaceVideoTrackAcrossPeers(newTrack: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc, peerId) => {
      const senders = pc.getSenders()
      const transceivers = pc.getTransceivers()

      const videoTransceiver = transceivers.find(
        (t) =>
          (t.sender.track && t.sender.track.kind === 'video') ||
          (t.receiver.track && t.receiver.track.kind === 'video')
      )

      const videoSender =
        videoTransceiver?.sender ||
        senders.find((s) => s.track && s.track.kind === 'video') ||
        senders.find((s) => (s as any).kind === 'video')

      if (videoSender) {
        console.log(`[WebRTC] Replacing video track for peer ${peerId} (trackId: ${newTrack?.id || 'null'})`)
        videoSender.replaceTrack(newTrack).catch((err) => {
          console.warn(`[WebRTC] replaceTrack error for ${peerId}:`, err)
        })
      } else if (newTrack) {
        try {
          console.log(`[WebRTC] Adding video track for peer ${peerId}`)
          pc.addTrack(newTrack, this.displayStream || this.localStream || new MediaStream([newTrack]))
          this.initiateOffer(peerId)
        } catch (err) {
          console.warn(`[WebRTC] addTrack error for ${peerId}:`, err)
        }
      }
    })
  }

  public removePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(peerId)
    }
    this.candidateQueue.delete(peerId)
    this.remoteStreams.delete(peerId)
    if (this.onPeerRemove) {
      this.onPeerRemove(peerId)
    }
  }

  public cleanup() {
    this.stopScreenShare()

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
    this.candidateQueue.clear()
    this.remoteStreams.clear()
  }
}

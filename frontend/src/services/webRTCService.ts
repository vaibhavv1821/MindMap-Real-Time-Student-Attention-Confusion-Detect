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
      return stream
    } catch (err: any) {
      console.warn('[WebRTC] Camera+Mic permission failed, attempting audio only:', err)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.localStream = audioStream
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

    // Attach local tracks
    const activeStream = this.displayStream || this.localStream
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream)
      })
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
      if (event.streams && event.streams[0] && this.onRemoteStream) {
        this.onRemoteStream(peerId, event.streams[0])
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
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        if (this.sendSignal) {
          this.sendSignal(peerId, {
            type: 'answer',
            sdp: pc.localDescription,
          })
        }
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      } else if (signal.type === 'candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${peerId}:`, err)
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

    // Restore camera video track across peers
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0]
      if (cameraTrack) {
        this.replaceVideoTrackAcrossPeers(cameraTrack)
      }
    }
  }

  public getIsSharingScreen(): boolean {
    return this.isSharingScreen
  }

  private replaceVideoTrackAcrossPeers(newTrack: MediaStreamTrack) {
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders()
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
      if (videoSender) {
        videoSender.replaceTrack(newTrack).catch((err) => {
          console.warn('[WebRTC] replaceTrack error:', err)
        })
      }
    })
  }

  public removePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(peerId)
    }
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
  }
}

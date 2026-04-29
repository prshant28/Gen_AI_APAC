/**
 * Gemini Live client — talks to our backend `/ws/live` relay (which proxies
 * to Google's Gemini Live API). The relay holds the API key, so the browser
 * never sees it.
 *
 * Capabilities:
 *   - Captures microphone at 16 kHz mono PCM and streams it as base64 frames.
 *   - Plays back model audio (24 kHz mono PCM) via Web Audio API.
 *   - Optionally captures camera or screen frames as JPEGs.
 *   - Surfaces user/model transcripts and tool-call events via callbacks.
 *
 * Designed to be UI-agnostic — `LiveChatPanel.tsx` wires it into a panel.
 */

import { auth } from "./firebase";

type LiveEventName =
  | "ready"
  | "setup_complete"
  | "user_transcript"
  | "model_transcript"
  | "text"
  | "tool_call_started"
  | "tool_call_done"
  | "turn_complete"
  | "interrupted"
  | "error"
  | "state";

type ConnState = "idle" | "connecting" | "connected" | "closing" | "closed" | "error";

export interface LiveEvent {
  type: LiveEventName;
  text?: string;
  state?: ConnState;
  name?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  calls?: unknown[];
  error?: string;
  model?: string;
  user_id?: string;
}

type Listener = (e: LiveEvent) => void;

const TARGET_INPUT_RATE = 16000;
const OUTPUT_PLAYBACK_RATE = 24000;

function resolveUid(): string {
  try {
    const fb = auth?.currentUser;
    if (fb && fb.uid && !fb.isAnonymous) return fb.uid;
  } catch {}
  try {
    const raw = localStorage.getItem("recall-guest-user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.isGuest || (typeof u?.uid === "string" && u.uid.startsWith("guest"))) {
        return "guest";
      }
      if (u?.uid) return String(u.uid);
    }
  } catch {}
  return "guest";
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private state: ConnState = "idle";

  // Mic capture
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null; // fallback path

  // Playback
  private playCtx: AudioContext | null = null;
  private playCursor = 0;

  // Camera / screen
  private videoStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private videoTimer: number | null = null;

  on(listener: Listener) {
    this.listeners.add(listener);
    listener({ type: "state", state: this.state });
    return () => this.listeners.delete(listener);
  }

  private emit(e: LiveEvent) {
    this.listeners.forEach((l) => {
      try { l(e); } catch {}
    });
  }

  private setState(s: ConnState) {
    this.state = s;
    this.emit({ type: "state", state: s });
  }

  getState(): ConnState {
    return this.state;
  }

  /** Connect the WebSocket. Does NOT start the mic — call `startMic()` after. */
  async connect(): Promise<void> {
    if (this.ws && (this.state === "connected" || this.state === "connecting")) return;
    this.setState("connecting");
    const uid = resolveUid();
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws/live?uid=${encodeURIComponent(uid)}`;

    await new Promise<void>((resolve, reject) => {
      let opened = false;
      try {
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        this.ws = ws;
        ws.onopen = () => {
          opened = true;
          this.setState("connected");
          resolve();
        };
        ws.onerror = (ev) => {
          if (!opened) {
            this.setState("error");
            this.emit({ type: "error", error: "WebSocket error" });
            reject(ev);
          }
        };
        ws.onclose = () => {
          this.setState("closed");
        };
        ws.onmessage = (ev) => this.handleFrame(ev.data);
      } catch (e: any) {
        this.setState("error");
        this.emit({ type: "error", error: String(e?.message || e) });
        reject(e);
      }
    });
  }

  private handleFrame(data: any) {
    if (typeof data !== "string") return;
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg?.type === "audio" && msg?.data) {
      this.playPcmBase64(msg.data as string);
      return;
    }
    if (msg?.type) {
      this.emit(msg as LiveEvent);
    }
  }

  /** Decode 16-bit PCM little-endian base64 → schedule on the play AudioContext. */
  private playPcmBase64(b64: string) {
    try {
      if (!this.playCtx) {
        this.playCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: OUTPUT_PLAYBACK_RATE,
        });
      }
      const bin = atob(b64);
      const len = bin.length;
      const i16 = new Int16Array(len / 2);
      for (let i = 0, j = 0; i < len; i += 2, j++) {
        i16[j] = (bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8)) << 16 >> 16;
      }
      const f32 = new Float32Array(i16.length);
      for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
      const buf = this.playCtx.createBuffer(1, f32.length, OUTPUT_PLAYBACK_RATE);
      buf.copyToChannel(f32, 0);
      const src = this.playCtx.createBufferSource();
      src.buffer = buf;
      src.connect(this.playCtx.destination);
      const now = this.playCtx.currentTime;
      const start = Math.max(now, this.playCursor);
      src.start(start);
      this.playCursor = start + buf.duration;
    } catch (e) {
      console.warn("Live: pcm decode/play failed", e);
    }
  }

  /** Send a typed user message. */
  sendText(text: string) {
    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "text", text }));
  }

  /** Cancel current model turn (barge-in). */
  interrupt() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "interrupt" }));
    }
    // Stop any queued playback by discarding the play context.
    try {
      this.playCtx?.close();
    } catch {}
    this.playCtx = null;
    this.playCursor = 0;
  }

  /** Start streaming mic at 16 kHz mono PCM. */
  async startMic(): Promise<void> {
    if (this.micStream) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.micStream = stream;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audioCtx = ctx;
    const source = ctx.createMediaStreamSource(stream);

    // Use a ScriptProcessor for max compatibility (no worklet file needed).
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const resampled = this.resample(input, ctx.sampleRate, TARGET_INPUT_RATE);
      const pcm16 = this.floatTo16BitPCM(resampled);
      const b64 = this.arrayBufferToBase64(pcm16.buffer);
      this.ws.send(JSON.stringify({ type: "audio", data: b64 }));
    };
    source.connect(proc);
    // Connect to a muted destination to keep the processor alive.
    const muted = ctx.createGain();
    muted.gain.value = 0;
    proc.connect(muted);
    muted.connect(ctx.destination);
    this.scriptNode = proc;
  }

  stopMic() {
    try { this.scriptNode?.disconnect(); } catch {}
    try { this.workletNode?.disconnect(); } catch {}
    try { this.audioCtx?.close(); } catch {}
    try { this.micStream?.getTracks().forEach((t) => t.stop()); } catch {}
    this.scriptNode = null;
    this.workletNode = null;
    this.audioCtx = null;
    this.micStream = null;
  }

  /** Start camera or screen capture; sends one JPEG every `intervalMs`. */
  async startVideo(source: "camera" | "screen", intervalMs = 1000): Promise<void> {
    this.stopVideo();
    let stream: MediaStream;
    if (source === "screen") {
      stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
    }
    this.videoStream = stream;
    const v = document.createElement("video");
    v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;
    await v.play();
    this.videoEl = v;

    const send = () => {
      if (!this.videoEl || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        const w = this.videoEl.videoWidth || 640;
        const h = this.videoEl.videoHeight || 480;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(this.videoEl, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const b64 = dataUrl.split(",")[1];
        if (b64) {
          this.ws.send(JSON.stringify({ type: "image", mime_type: "image/jpeg", data: b64 }));
        }
      } catch (e) {
        console.warn("Live: video frame send failed", e);
      }
    };
    this.videoTimer = window.setInterval(send, intervalMs);
  }

  stopVideo() {
    if (this.videoTimer) {
      clearInterval(this.videoTimer);
      this.videoTimer = null;
    }
    try { this.videoStream?.getTracks().forEach((t) => t.stop()); } catch {}
    this.videoStream = null;
    this.videoEl = null;
  }

  isVideoOn(): boolean {
    return !!this.videoStream;
  }

  isMicOn(): boolean {
    return !!this.micStream;
  }

  disconnect() {
    this.setState("closing");
    this.stopMic();
    this.stopVideo();
    try { this.ws?.close(); } catch {}
    this.ws = null;
    try { this.playCtx?.close(); } catch {}
    this.playCtx = null;
    this.playCursor = 0;
    this.setState("closed");
  }

  // ─── helpers ──────────────────────────────────────────────────────────────
  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const newLen = Math.round(input.length / ratio);
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const srcPos = i * ratio;
      const i0 = Math.floor(srcPos);
      const i1 = Math.min(input.length - 1, i0 + 1);
      const frac = srcPos - i0;
      out[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    return out;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, Math.min(i + chunk, bytes.length)) as unknown as number[],
      );
    }
    return btoa(binary);
  }
}

// Singleton — only one Live session at a time per page.
let _client: LiveClient | null = null;
export function getLiveClient(): LiveClient {
  if (!_client) _client = new LiveClient();
  return _client;
}

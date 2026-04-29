/**
 * LiveChatPanel — floating panel that gives the user a real-time voice / video
 * conversation with their Second Brain via the Gemini Live API.
 *
 * Composition:
 *   - <LiveButton/> renders a floating "Live" button on every page.
 *   - <LivePanel/> is the expanded panel: connect/disconnect, mic, camera,
 *     screen share, transcript, and tool-call feed.
 *
 * Both rely on the shared `getLiveClient()` singleton in `lib/liveClient.ts`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Phone, PhoneOff,
  Radio, Wand2, X, Send, Loader2,
} from "lucide-react";
import { getLiveClient, type LiveEvent } from "../lib/liveClient";

type TranscriptEntry =
  | { id: string; role: "user" | "model"; text: string }
  | { id: string; role: "tool"; name: string; args: Record<string, unknown>; result?: Record<string, unknown> };

interface PanelProps {
  open: boolean;
  onClose: () => void;
}

const LivePanel: React.FC<PanelProps> = ({ open, onClose }) => {
  const client = useMemo(() => getLiveClient(), []);
  const [state, setState] = useState<string>(client.getState());
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [model, setModel] = useState<string>("");
  const [error, setError] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Buffer streaming text fragments into a single transcript line per turn.
  const userBufRef = useRef<string>("");
  const modelBufRef = useRef<string>("");
  const userIdRef = useRef<string>("");
  const modelIdRef = useRef<string>("");

  const flushUser = useCallback(() => {
    const t = userBufRef.current.trim();
    if (!t) return;
    setTranscript((cur) => {
      const next = [...cur];
      const id = userIdRef.current || `u-${Date.now()}`;
      const last = next[next.length - 1];
      if (last && last.role === "user" && last.id === id) {
        (last as any).text = t;
      } else {
        next.push({ id, role: "user", text: t });
        userIdRef.current = id;
      }
      return next;
    });
  }, []);

  const flushModel = useCallback(() => {
    const t = modelBufRef.current.trim();
    if (!t) return;
    setTranscript((cur) => {
      const next = [...cur];
      const id = modelIdRef.current || `m-${Date.now()}`;
      const last = next[next.length - 1];
      if (last && last.role === "model" && last.id === id) {
        (last as any).text = t;
      } else {
        next.push({ id, role: "model", text: t });
        modelIdRef.current = id;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const off = client.on((e: LiveEvent) => {
      if (e.type === "state") setState(e.state || "");
      if (e.type === "ready" && e.model) setModel(e.model);
      if (e.type === "error") setError(e.error || "Unknown error");
      if (e.type === "user_transcript") {
        userBufRef.current += (e.text || "");
        flushUser();
      }
      if (e.type === "model_transcript") {
        modelBufRef.current += (e.text || "");
        flushModel();
      }
      if (e.type === "text") {
        modelBufRef.current += (e.text || "");
        flushModel();
      }
      if (e.type === "turn_complete" || e.type === "interrupted") {
        userBufRef.current = "";
        modelBufRef.current = "";
        userIdRef.current = "";
        modelIdRef.current = `m-${Date.now()}`;
      }
      if (e.type === "tool_call_done") {
        setTranscript((cur) => [
          ...cur,
          {
            id: `t-${Date.now()}-${Math.random()}`,
            role: "tool",
            name: e.name || "",
            args: (e.args as Record<string, unknown>) || {},
            result: (e.result as Record<string, unknown>) || {},
          },
        ]);
      }
    });
    return () => { off(); };
  }, [client, flushUser, flushModel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length]);

  const connect = useCallback(async () => {
    setError("");
    try {
      await client.connect();
    } catch (e: any) {
      setError(e?.message || "Couldn't start Live session.");
      return;
    }
    // Mic is best-effort — if the user denies permission or there's no
    // device, text-only and screen/camera modes still work, so we silently
    // skip rather than surfacing a scary "Requested device not found" error.
    try {
      await client.startMic();
      setMicOn(true);
    } catch {
      setMicOn(false);
    }
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
    setMicOn(false);
    setCamOn(false);
    setScreenOn(false);
  }, [client]);

  // Privacy: when the panel closes, immediately stop mic/camera/screen and
  // tear down the upstream session — never silently keep recording.
  useEffect(() => {
    if (!open) {
      try { client.disconnect(); } catch {}
      setMicOn(false); setCamOn(false); setScreenOn(false);
    }
  }, [open, client]);

  const toggleMic = useCallback(async () => {
    if (micOn) { client.stopMic(); setMicOn(false); }
    else { await client.startMic(); setMicOn(true); }
  }, [client, micOn]);

  const toggleCam = useCallback(async () => {
    try {
      if (camOn) { client.stopVideo(); setCamOn(false); return; }
      if (screenOn) { client.stopVideo(); setScreenOn(false); }
      await client.startVideo("camera", 1500);
      setCamOn(true);
    } catch (e: any) {
      setError(e?.message || "Camera permission denied.");
    }
  }, [client, camOn, screenOn]);

  const toggleScreen = useCallback(async () => {
    try {
      if (screenOn) { client.stopVideo(); setScreenOn(false); return; }
      if (camOn) { client.stopVideo(); setCamOn(false); }
      await client.startVideo("screen", 2000);
      setScreenOn(true);
    } catch (e: any) {
      setError(e?.message || "Screen-share cancelled.");
    }
  }, [client, camOn, screenOn]);

  const send = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    client.sendText(text);
    setTranscript((cur) => [...cur, { id: `u-${Date.now()}`, role: "user", text }]);
    setTextInput("");
    modelIdRef.current = `m-${Date.now()}`;
  }, [client, textInput]);

  const isConnected = state === "connected";
  const isConnecting = state === "connecting";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "fixed", right: 20, bottom: 92, width: 380, maxWidth: "calc(100vw - 32px)",
            height: 540, maxHeight: "calc(100vh - 120px)", zIndex: 9999,
            background: "var(--card-bg, #0f172a)",
            color: "var(--text, #e2e8f0)",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.10))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 28, height: 28, borderRadius: 8,
                  background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "grid", placeItems: "center" }}>
                <Radio size={16} color="#fff" />
                {isConnected && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10,
                      borderRadius: 5, background: "#22c55e", border: "2px solid #0f172a",
                      animation: "live-pulse 1.4s infinite" }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Live with Brain</div>
                <div style={{ fontSize: 11, opacity: 0.65 }}>
                  {isConnected ? `Connected · ${model || "Gemini Live"}`
                    : isConnecting ? "Connecting…"
                    : state === "error" ? "Error" : "Idle"}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={btnIcon} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex",
              flexDirection: "column", gap: 8 }}>
            {transcript.length === 0 && (
              <div style={{ opacity: 0.55, fontSize: 12, textAlign: "center", marginTop: 50 }}>
                Tap the green call button to start. Speak naturally — your brain is listening.
                <div style={{ fontSize: 11, marginTop: 12, opacity: 0.7 }}>
                  Try: <em>"Save this thought: …"</em>, <em>"What did I save about React?"</em>,
                  <em> "Schedule revision tomorrow at 7"</em>
                </div>
              </div>
            )}
            {transcript.map((entry) => {
              if (entry.role === "tool") {
                return (
                  <div key={entry.id} style={{ alignSelf: "stretch", padding: "8px 10px", borderRadius: 10,
                      background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.25)",
                      fontSize: 11, opacity: 0.92 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Wand2 size={12} />
                      <strong>{entry.name}</strong>
                    </div>
                    <div style={{ opacity: 0.75 }}>
                      {summariseToolResult(entry.name, entry.result || {}, entry.args)}
                    </div>
                  </div>
                );
              }
              const mine = entry.role === "user";
              return (
                <div key={entry.id} style={{ alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.4,
                    background: mine ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
                    border: mine ? "1px solid rgba(99,102,241,0.30)" : "1px solid rgba(255,255,255,0.06)" }}>
                  {entry.text}
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ padding: "6px 12px", fontSize: 11, color: "#fca5a5",
                background: "rgba(239,68,68,0.10)", borderTop: "1px solid rgba(239,68,68,0.25)" }}>
              {error}
            </div>
          )}

          {/* Text input */}
          <div style={{ display: "flex", gap: 6, padding: "8px 10px",
              borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={isConnected ? "Type instead of speaking…" : "Connect first to chat"}
              disabled={!isConnected}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)", color: "inherit", outline: "none" }}
            />
            <button onClick={send} disabled={!isConnected || !textInput.trim()} style={btnIcon} aria-label="Send">
              <Send size={14} />
            </button>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.20)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={toggleMic} disabled={!isConnected} style={ctrlBtn(micOn)}
                title={micOn ? "Mute" : "Unmute"}>
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button onClick={toggleCam} disabled={!isConnected} style={ctrlBtn(camOn)}
                title={camOn ? "Stop camera" : "Start camera"}>
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
              <button onClick={toggleScreen} disabled={!isConnected} style={ctrlBtn(screenOn)}
                title={screenOn ? "Stop screen share" : "Share screen"}>
                <MonitorUp size={16} />
              </button>
            </div>
            {isConnected ? (
              <button onClick={disconnect} style={{ ...callBtn, background: "#ef4444" }} title="End">
                <PhoneOff size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>End</span>
              </button>
            ) : (
              <button onClick={connect} disabled={isConnecting}
                style={{ ...callBtn, background: "#22c55e", opacity: isConnecting ? 0.7 : 1 }} title="Start">
                {isConnecting ? <Loader2 size={16} className="spin" /> : <Phone size={16} />}
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {isConnecting ? "Connecting" : "Start"}
                </span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function summariseToolResult(name: string, result: Record<string, unknown>, args: Record<string, unknown>): string {
  if (result?.error) return `Error: ${String(result.error)}`;
  switch (name) {
    case "save_memory":
      return `Saved memory${result?.title ? ` — "${result.title}"` : ""}.`;
    case "capture_url":
      return `Captured ${String(args?.url || "URL")}.`;
    case "create_task":
      return `Task created${result?.title ? `: "${result.title}"` : ""}.`;
    case "list_tasks": {
      const tasks = (result?.tasks as any[]) || [];
      if (!tasks.length) return "No pending tasks.";
      return tasks.map((t) => `• ${t.title}`).slice(0, 5).join("  ");
    }
    case "complete_task":
      return "Marked task complete.";
    case "create_calendar_event":
      return `Event scheduled${args?.title ? ` — "${args.title}"` : ""}.`;
    case "create_revisit":
      return `Revisit set for "${args?.topic}" (${args?.frequency || "weekly"}).`;
    case "recall_memories": {
      const r = (result?.results as any[]) || [];
      if (!r.length) return `No memories matched "${args?.query}".`;
      return `Found ${r.length}: ${r.map((m) => m.title || m.snippet).slice(0, 3).join("; ")}`;
    }
    case "create_note":
      return "Note saved.";
    case "create_bookmark":
      return `Bookmark saved: ${String(args?.url || "")}`;
    case "daily_briefing":
      return "Briefing ready.";
    default:
      return JSON.stringify(result).slice(0, 160);
  }
}

const btnIcon: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)", color: "inherit", cursor: "pointer",
  display: "grid", placeItems: "center",
};

const ctrlBtn = (active: boolean): React.CSSProperties => ({
  ...btnIcon,
  width: 36, height: 36,
  background: active ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
  borderColor: active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
});

const callBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
  borderRadius: 999, border: "none", color: "#fff", cursor: "pointer",
};

interface ButtonProps {
  enabled: boolean;
}

export const LiveButton: React.FC<ButtonProps> = ({ enabled }) => {
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", right: 20, bottom: 24, zIndex: 9998,
          width: 56, height: 56, borderRadius: 28, border: "none",
          background: "linear-gradient(135deg, #6366f1, #06b6d4)",
          color: "#fff", cursor: "pointer",
          boxShadow: "0 10px 30px rgba(99,102,241,0.45)",
          display: "grid", placeItems: "center",
        }}
        aria-label="Open live chat"
        title="Live voice/video with your Brain"
      >
        <Radio size={22} />
      </motion.button>
      <LivePanel open={open} onClose={() => setOpen(false)} />
      <style>{`
        @keyframes live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

/** Asks the backend whether Live is configured (i.e. an API key is set) and
 *  only mounts the floating button if so. Avoids a dead button in dev. */
export const LiveGate: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/live/status")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => { if (!cancelled) setEnabled(!!d?.enabled); })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);
  return <LiveButton enabled={enabled} />;
};

export default LiveButton;

import { useRef, useCallback } from "react";

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel" default
const MODEL_ID = "eleven_multilingual_v2";

interface StreamingTTSControls {
  /** Call when AI streaming starts and voice mode is active */
  start: () => Promise<void>;
  /** Call with new text content as it arrives from the AI stream */
  sendText: (text: string) => void;
  /** Call when AI streaming finishes to flush remaining audio */
  finish: () => void;
  /** Call to immediately stop playback and close connection */
  stop: () => void;
  /** Whether TTS is currently active */
  isActive: () => boolean;
}

export function useStreamingTTS(): StreamingTTSControls {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeRef = useRef(false);
  const sentLengthRef = useRef(0);

  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  const playAudioChunk = async (base64Audio: string) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn("[StreamingTTS] Failed to play audio chunk:", err);
    }
  };

  const start = useCallback(async () => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    activeRef.current = true;
    sentLengthRef.current = 0;
    nextPlayTimeRef.current = 0;

    // Get single-use token from our server
    let token: string;
    try {
      const res = await fetch("/api/speech/token", { method: "POST" });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const data = (await res.json()) as { token: string };
      token = data.token;
    } catch (err) {
      console.error("[StreamingTTS] Failed to get token:", err);
      activeRef.current = false;
      return;
    }

    // Open WebSocket to ElevenLabs
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}&single_use_token=${token}&output_format=mp3_44100_128`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[StreamingTTS] WebSocket connected");
      // Send initialization message
      ws.send(
        JSON.stringify({
          text: " ",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
          generation_config: { chunk_length_schedule: [50, 120, 160, 250] },
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          audio?: string;
          isFinal?: boolean;
        };
        if (data.audio) {
          void playAudioChunk(data.audio);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = (err) => {
      console.error("[StreamingTTS] WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("[StreamingTTS] WebSocket closed");
      activeRef.current = false;
    };
  }, []);

  const sendText = useCallback((fullText: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Only send the new portion of text
    const newText = fullText.slice(sentLengthRef.current);
    if (!newText) return;

    sentLengthRef.current = fullText.length;
    ws.send(
      JSON.stringify({
        text: newText,
        try_trigger_generation: true,
      }),
    );
  }, []);

  const finish = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Send flush to generate audio for any remaining buffered text
    ws.send(JSON.stringify({ text: "", flush: true }));

    // Close after a short delay to allow final audio chunks
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text: "" }));
        ws.close();
      }
    }, 5000);
  }, []);

  const stop = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ text: "" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop all scheduled audio
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    activeRef.current = false;
    sentLengthRef.current = 0;
    nextPlayTimeRef.current = 0;
  }, []);

  const isActive = useCallback(() => activeRef.current, []);

  return { start, sendText, finish, stop, isActive };
}

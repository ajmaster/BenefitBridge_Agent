"use client";

import { useRef, useState } from "react";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { cn } from "@/lib/utils";
import type { VoiceStatus } from "@/lib/types";

const voiceEnabled = process.env.NEXT_PUBLIC_ENABLE_VOICE === "true";

type VoiceRecorderButtonProps = {
  disabled?: boolean;
  status: VoiceStatus;
  labels: {
    permissionDenied: string;
    recording: string;
    speak: string;
    stop: string;
    unavailable: string;
    unsupported: string;
  };
  onRecordingComplete: (blob: Blob) => void;
};

// Client-side capture only: this button records a short utterance with
// MediaRecorder and hands the resulting Blob to the caller, which posts it to
// POST /api/voice/turn. There is no client-side speech recognition here - all
// transcription/safety screening happens server-side, identical to text chat.
export function VoiceRecorderButton({
  disabled,
  status: voiceStatus,
  labels,
  onRecordingComplete,
}: VoiceRecorderButtonProps) {
  const [recording, setRecording] = useState(false);
  const [recorderStatus, setRecorderStatus] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const voiceAvailable = voiceEnabled && voiceStatus.available;
  const runtimeUnavailable = voiceEnabled && !voiceStatus.available ? labels.unavailable : null;
  const visibleStatus = voiceAvailable ? recorderStatus : runtimeUnavailable ?? labels.unavailable;

  async function startRecording() {
    if (!voiceAvailable) {
      setRecorderStatus(labels.unavailable);
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecorderStatus(labels.unsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      setRecorderStatus(labels.recording);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecorderStatus(null);
        onRecordingComplete(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
      setRecorderStatus(labels.permissionDenied);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex min-w-[8rem] flex-col gap-1">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled || !voiceAvailable}
        aria-pressed={recording}
        title={voiceAvailable ? labels.speak : labels.unavailable}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
          recording
            ? "border-red bg-red-soft text-red"
            : "border-line text-ink-soft hover:bg-sky/40",
        )}
      >
        <AtlasIcon name="mic" className="h-4 w-4" />
        <span>{recording ? labels.stop : voiceAvailable ? labels.speak : labels.unavailable}</span>
      </button>
      {visibleStatus && (
        <p className="max-w-40 text-xs leading-snug text-muted" aria-live="polite">
          {visibleStatus}
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudio } from '@/lib/api';
import { BorderBeam } from 'border-beam';

interface VoiceButtonProps {
  /** Receives the final transcript; the caller decides what to do with it. */
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

type Mode = 'idle' | 'recording' | 'processing';

const hasWebSpeechAPI = () =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

/**
 * Mic button for the chat composer.
 * Uses the browser's Web Speech API when available; otherwise records
 * audio and transcribes it through the backend Whisper endpoint.
 */
export function VoiceButton({ onTranscript, onError, disabled = false }: VoiceButtonProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [waveformBars, setWaveformBars] = useState<number[]>([0.3, 0.5, 0.7, 0.5, 0.3]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fellBackRef = useRef(false);

  const teardownAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      teardownAudio();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [teardownAudio]);

  /* Mic stream shared by the waveform and the Whisper recorder */
  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current?.active) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const startWaveform = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(stream).connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.floor(dataArray.length / 5);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      setWaveformBars(Array.from({ length: 5 }, (_, i) =>
        Math.max(0.15, dataArray[i * step] / 255)
      ));
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const startWhisperRecording = useCallback(async () => {
    try {
      const stream = await ensureStream();
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        teardownAudio();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (blob.size === 0) {
          setMode('idle');
          return;
        }
        setMode('processing');
        try {
          const file = new File([blob], 'recording.webm', { type: mimeType });
          const result = await transcribeAudio(file);
          if (result.transcript) onTranscript(result.transcript);
        } catch {
          onError("Couldn't transcribe that. Please try again.");
        } finally {
          setMode('idle');
        }
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
    } catch {
      onError('Microphone access denied. Allow the microphone to use voice input.');
      teardownAudio();
      setMode('idle');
    }
  }, [ensureStream, teardownAudio, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // onstop handles teardown + transcription
      mediaRecorderRef.current = null;
    } else {
      teardownAudio();
      setMode('idle');
    }
  }, [teardownAudio]);

  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let transcript = '';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript + ' ';
      }
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;
      try { recognition.abort(); } catch {}

      if (event.error === 'not-allowed') {
        onError('Microphone access denied. Allow the microphone to use voice input.');
        teardownAudio();
        setMode('idle');
        return;
      }
      if (event.error === 'no-speech' || event.error === 'aborted') {
        teardownAudio();
        setMode('idle');
        return;
      }
      // Anything else (e.g. 'network' in browsers without a speech service):
      // switch to recording locally and let Whisper transcribe on stop.
      if (!fellBackRef.current) {
        fellBackRef.current = true;
        startWhisperRecording();
        return;
      }
      onError('Voice input is unavailable right now.');
      teardownAudio();
      setMode('idle');
    };

    recognition.onend = () => {
      if (transcript.trim()) onTranscript(transcript.trim());
      if (!fellBackRef.current) {
        teardownAudio();
        setMode('idle');
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [onTranscript, onError, teardownAudio, startWhisperRecording]);

  const startRecording = useCallback(async () => {
    fellBackRef.current = false;
    setMode('recording');

    if (hasWebSpeechAPI()) {
      // Waveform is cosmetic here — don't block speech recognition on it
      try { startWaveform(await ensureStream()); } catch {}
      startWebSpeech();
    } else {
      try {
        startWaveform(await ensureStream());
      } catch {
        onError('Microphone access denied. Allow the microphone to use voice input.');
        setMode('idle');
        return;
      }
      await startWhisperRecording();
    }
  }, [ensureStream, startWaveform, startWebSpeech, startWhisperRecording, onError]);

  const recording = mode === 'recording';
  const processing = mode === 'processing';

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {recording && (
        <div className="voice-waveform flex items-center gap-[3px]">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className="voice-waveform-bar"
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
      )}
      <BorderBeam size="sm" theme="auto" colorVariant="sunset" active={recording}>
        <button
          type="button"
          onClick={() => (recording ? stopRecording() : startRecording())}
          disabled={disabled || processing}
          className={[
            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-[100ms]',
            disabled ? 'opacity-30 cursor-not-allowed' : '',
          ].join(' ')}
          style={
            recording
              ? { background: 'var(--ds-error-muted)', color: 'var(--ds-error)' }
              : { background: 'var(--ds-base-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-2)' }
          }
          aria-label={recording ? 'Stop recording' : 'Ask with your voice'}
          title={recording ? 'Stop recording' : 'Ask with your voice'}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recording ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      </BorderBeam>
    </div>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { transcribeAudio } from '@/lib/api';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

const hasWebSpeechAPI = () =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export const VoiceInput = ({ onTranscript, disabled = false }: VoiceInputProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const fellBackToWhisperRef = useRef(false);

    const [waveformBars, setWaveformBars] = useState<number[]>([0.3, 0.5, 0.7, 0.5, 0.3]);
    const animFrameRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const animateWaveform = useCallback(() => {
        if (!analyserRef.current) return;
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
            analyser.getByteFrequencyData(dataArray);
            // Sample 5 frequency bands
            const step = Math.floor(dataArray.length / 5);
            const bars = Array.from({ length: 5 }, (_, i) => {
                const val = dataArray[i * step] / 255;
                return Math.max(0.15, val);
            });
            setWaveformBars(bars);
            animFrameRef.current = requestAnimationFrame(update);
        };
        update();
    }, []);

    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { }
            }
        };
    }, []);

    // Web Speech API
    const startWebSpeech = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        let transcript = '';

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript + ' ';
                }
            }
        };

        recognition.onerror = (event: any) => {
            const err = event.error;
            console.warn('Web Speech API error:', err);

            recognitionRef.current = null;
            try { recognition.abort(); } catch { }

            if (err === 'not-allowed') {
                setError('Microphone access denied');
                stopRecording();
                return;
            }

            if (err === 'no-speech' || err === 'aborted') {
                cleanup();
                return;
            }

            if (!fellBackToWhisperRef.current) {
                fellBackToWhisperRef.current = true;
                console.info('Falling back to Whisper API for transcription');
                startWhisperRecording();
                return;
            }

            setError('Voice input unavailable');
            stopRecording();
        };

        recognition.onend = () => {
            if (transcript.trim()) {
                onTranscript(transcript.trim());
            }
    
            if (!fellBackToWhisperRef.current) {
                cleanup();
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, [onTranscript]);

    // Whisper fallback
    const startWhisperRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio analyser for waveform
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;
            animateWaveform();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
            });
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                setMode('processing');
                setIsProcessing(true);
                try {
                    const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                    const file = new File([blob], 'recording.webm', { type: mediaRecorder.mimeType });
                    const result = await transcribeAudio(file);
                    if (result.transcript) {
                        onTranscript(result.transcript);
                    }
                } catch (err: any) {
                    console.error('Whisper transcription failed:', err);
                    setError('Transcription failed. Please try again.');
                } finally {
                    setIsProcessing(false);
                    setMode('idle');
                }
            };

            mediaRecorder.start(250);
            mediaRecorderRef.current = mediaRecorder;
        } catch (err: any) {
            console.error('Mic access error:', err);
            setError('Microphone access denied');
            cleanup();
        }
    }, [onTranscript, animateWaveform]);

    const startRecording = useCallback(async () => {
        setError(null);
        setIsRecording(true);
        setMode('recording');
        fellBackToWhisperRef.current = false;

        if (hasWebSpeechAPI()) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);
                analyserRef.current = analyser;
                animateWaveform();
            } catch { }

            startWebSpeech();
        } else {
            await startWhisperRecording();
        }
    }, [startWebSpeech, startWhisperRecording, animateWaveform]);

    const stopRecording = useCallback(() => {
        setIsRecording(false);

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
            recognitionRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    const cleanup = useCallback(() => {
        setIsRecording(false);
        setMode('idle');
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="flex items-center gap-2">
            {isRecording && (
                <div className="voice-waveform flex items-center gap-[3px] h-6">
                    {waveformBars.map((height, i) => (
                        <div
                            key={i}
                            className="voice-waveform-bar"
                            style={{
                                height: `${Math.round(height * 100)}%`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {isProcessing && (
                <span className="flex items-center gap-1 text-xs text-[#c2c6d7]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Transcribing...
                </span>
            )}

            {error && (
                <span className="text-xs text-[#ffb4ab]">{error}</span>
            )}

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClick}
                disabled={disabled || isProcessing}
                className={`relative h-10 w-10 rounded-2xl border border-white/10 transition-all duration-300 ${isRecording
                    ? 'bg-red-500/10 text-[#ffb4ab] hover:bg-red-500/20 voice-recording-pulse'
                    : 'bg-[#353437]/50 text-[#c2c6d7] hover:bg-[#afc6ff]/15 hover:text-[#afc6ff]'
                    }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
            >
                {isRecording ? (
                    <MicOff className="h-4 w-4" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
};

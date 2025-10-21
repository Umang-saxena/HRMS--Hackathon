'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Corrected path
import type { Message, InterviewStatus, UseAiInterviewProps, UseAiInterviewReturn } from '@/types/interview'; // Adjust path

const API_URL = process.env.NEXT_PUBLIC_AI_INTERVIEW_API_URL || 'http://127.0.0.1:8001';

// Log a warning if the API URL is not set
if (!process.env.NEXT_PUBLIC_AI_INTERVIEW_API_URL) {
    console.warn("NEXT_PUBLIC_AI_INTERVIEW_API_URL environment variable is not set. Using default API URL.");
}
const LISTEN_TIMEOUT_SECONDS = 15; // Timeout for user silence



// Use the return type from types/interview.ts

// Extend the global SpeechRecognition interface for better typing
interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((this: ISpeechRecognition, ev: any) => any) | null;
    onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: ISpeechRecognition, ev: any) => any) | null;
    onstart: ((this: ISpeechRecognition, ev: Event) => any) | null; // Corrected type
    start(): void;
    stop(): void;
    abort(): void;
}

export const useAiInterview = ({
    jobDescription,
    resumeText,
    jobTitle,
}: UseAiInterviewProps): UseAiInterviewReturn => {
    const [history, setHistory] = useState<Message[]>([]);
    const [status, setStatus] = useState<InterviewStatus>('idle');
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [listeningTimer, setListeningTimer] = useState<number | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const listeningActiveRef = useRef(false); // Ref to track if STT is supposed to be active
    const statusRef = useRef<InterviewStatus>(status);
    const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { statusRef.current = status; }, [status]);

    // --- Helper to clear timeouts ---
    const clearListenTimeouts = useCallback(() => {
        if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        listenTimeoutRef.current = null;
        countdownIntervalRef.current = null;
        setListeningTimer(null);
        listeningActiveRef.current = false; // Also reset listening flag here
        console.log("Cleared listen timeouts and flags.");
    }, []);

    // --- Text-to-Speech ---
    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) { console.error('Speech synthesis not supported.'); setStatus('error'); return; }
        setStatus('speaking');
        listeningActiveRef.current = false;
        clearListenTimeouts();
        try { window.speechSynthesis.cancel(); } catch (e) { console.warn('TTS cancel failed:', e); }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        utterance.onend = () => {
            // Only proceed if the interview wasn't stopped during speech
            if (statusRef.current === 'speaking') {
                // Start MediaRecorder (it continues until finishInterview)
                try {
                    if (mediaRecorderRef.current?.state === 'inactive') {
                        mediaRecorderRef.current.start(1000); // Start recording, chunking data
                        console.log("MediaRecorder started for recording.");
                    }
                } catch (e) { console.warn('MediaRecorder.start() failed:', e); }

                // Attempt to start Speech Recognition
                if (recognitionRef.current) {
                    if (!listeningActiveRef.current) { // Check flag
                        try {
                            console.log("Attempting to start SpeechRecognition...");
                            recognitionRef.current.start(); // <<< Start listening
                            // NOTE: onstart event will set flags and status
                        } catch (e) {
                            console.error('Recognition start() command failed:', e); setStatus('error'); clearListenTimeouts();
                        }
                    } else { console.log("Recognition start skipped: flag indicates already active."); }
                }
            } else { console.log("Speak ended, but status changed. Not starting STT/Recording."); }
        };
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            console.error('Speech synthesis error:', event);
            setStatus('error');
        };
        try { window.speechSynthesis.speak(utterance); } catch (e) { /* ... handle error ... */ }
    }, [clearListenTimeouts]); // Added dependency

    // --- Backend Communication ---
    const getNextAiResponse = useCallback(async (currentHistory: Message[]) => {
        setStatus('waiting_for_ai');
        clearListenTimeouts(); // Clear timeouts before AI responds
        try {
            const response = await fetch(`${API_URL}/conversation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: currentHistory,
                    job_description: jobDescription,
                    resume_text: resumeText,
                    job_title: jobTitle,
                }),
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const aiMessage = (await response.json()) as Message;
            setHistory((prev) => [...prev, aiMessage]);
            speak(aiMessage.content); // Trigger AI speech
        } catch (error) { console.error('Error fetching AI response:', error); setStatus('error'); }
    }, [jobDescription, resumeText, jobTitle, speak, clearListenTimeouts]);

    // --- Upload and Analyze ---
    const uploadAndAnalyze = useCallback(async (audioFile: File) => {
        // ... (This function remains the same, ensure mime type/extension is webm) ...
        console.log(`Uploading audio file: ${audioFile.name}...`);
        // Status is already 'processing'

        const uniqueFileName = `interview-${Date.now()}.webm`; // Consistent .webm
        try {
            const { data: uploadData, error: uploadError } = await supabase.storage.from('resumes_and_interviews').upload(uniqueFileName, audioFile, { contentType: 'audio/webm', cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            console.log("Supabase upload successful.");

            const response = await fetch(`${API_URL}/start-analysis`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interview_id: `interview-${Date.now()}`, job_title: jobTitle, job_description: jobDescription, audio_file_name: uniqueFileName }),
            });
            if (!response.ok) throw new Error(`Analysis API Error: ${response.statusText}`);
            console.log("Analysis trigger response:", await response.json());
            setStatus('finished');
        } catch (error) { console.error("Upload or Analysis Trigger Error:", error); setStatus('error'); }
    }, [jobTitle, jobDescription]);

// --- MediaRecorder Stop Handler ---
const handleMediaRecorderStop = useCallback(() => {
    // This handler is now ONLY called when finishInterview stops the recorder.
    if (statusRef.current !== 'processing') {
        console.warn("MediaRecorder stopped unexpectedly (not during finish). Ignoring.");
        return;
    }
    if (audioChunks.length === 0) { console.log("Finish called, no audio chunks recorded."); setStatus('finished'); return; }

    console.log("Processing final recorded audio chunks for upload...");
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioFile = new File([audioBlob], `interview_audio_${Date.now()}.webm`, { type: 'audio/webm' });
    setAudioChunks([]); // Clear for next interview
    uploadAndAnalyze(audioFile); // Upload the final file

}, [audioChunks, uploadAndAnalyze]);

// --- Finish Interview ---
const finishInterview = useCallback(() => {
    // Check if interview is in a state that can be finished
    if (statusRef.current === 'idle' || statusRef.current === 'starting' || statusRef.current === 'processing' || statusRef.current === 'finished' || statusRef.current === 'error') {
        console.log(`Cannot finish interview from status: ${statusRef.current}`); return;
    }
    setStatus('processing'); // Set status before stopping things
    console.log("Stopping interview and all related processes...");
    clearListenTimeouts(); // Stop timers
    try { window.speechSynthesis.cancel(); } catch (e) {/* ignore */ }
    // Abort active SpeechRecognition
    if (listeningActiveRef.current && recognitionRef.current) {
        try { recognitionRef.current.abort(); console.log("STT aborted."); } catch (e) {/* ignore */ }
    }
    listeningActiveRef.current = false; // Reset flag

    // Stop the MediaRecorder if it's currently recording - triggers handleMediaRecorderStop
    if (mediaRecorderRef.current?.state === 'recording') {
        try { mediaRecorderRef.current.stop(); console.log("MediaRecorder stopping..."); }
        catch (e) { console.error("Error stopping MediaRecorder:", e); setStatus('error'); }
    }
    // If recorder isn't running but we have chunks (shouldn't happen with continuous recording, but safety check)
    else if (audioChunks.length > 0) {
        console.log("Recorder was inactive during finish, processing existing chunks.")
        handleMediaRecorderStop(); // Manually trigger processing
    }
    // If recorder inactive AND no chunks
    else {
        console.log("No recording was active or no audio chunks available.");
        setStatus('finished'); // Nothing to analyze
    }
}, [audioChunks, handleMediaRecorderStop, clearListenTimeouts]); // Dependencies

// --- Initialization Effect (Runs Once on Mount) ---
useEffect(() => {
    let recognition: ISpeechRecognition | null = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;

    const initialize = async () => {
        setStatus('starting');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // --- Setup Media Recorder (to run continuously) ---
            const options = { mimeType: 'audio/webm;codecs=opus' };
            try { // Add try/catch specifically for MediaRecorder
                recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
            } catch (e) { console.error("Failed to create MediaRecorder:", e); throw e; }
            recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) setAudioChunks((prev) => [...prev, event.data]); };
            recorder.onstop = handleMediaRecorderStop; // Assign the final processing handler
            recorder.onerror = (event: Event) => { console.error("MediaRecorder error:", event); setStatus('error'); };
            mediaRecorderRef.current = recorder;
            console.log("MediaRecorder initialized.");

            // --- Setup Speech Recognition ---
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) throw new Error("Speech recognition not supported.");
            recognition = new SpeechRecognition() as ISpeechRecognition;
            recognition.lang = 'en-US';
            recognition.continuous = false; // <<< Use false: Stop automatically after pause
            recognition.interimResults = false;

            // --- Recognition Event Handlers ---

            recognition.onstart = () => {
                console.log("Speech recognition started.");
                listeningActiveRef.current = true; // Set flag
                // Status and timers are set here
                setStatus('listening');
                setListeningTimer(LISTEN_TIMEOUT_SECONDS);
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = setInterval(() => {
                    setListeningTimer((t) => (t !== null && t > 0 ? t - 1 : 0));
                }, 1000);

                if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
                listenTimeoutRef.current = setTimeout(() => {
                    if (listeningActiveRef.current && statusRef.current === 'listening') {
                        console.log(`⏰ ${LISTEN_TIMEOUT_SECONDS}s timeout reached.`);
                        try { recognitionRef.current?.abort(); } catch (e) {/* ignore */ } // Abort STT
                        // No need to clear timeouts here, onerror or onend will handle it
                        // Logic to inform AI is now in onerror('aborted' or 'no-speech')
                    }
                }, LISTEN_TIMEOUT_SECONDS * 1000);
            };

            recognition.onresult = (event: any) => {
                clearListenTimeouts(); // <<< Stop timers on result
                listeningActiveRef.current = false; // Recognition processed
                const transcript = event.results[0][0].transcript as string;
                console.log("Transcript received:", transcript);
                if (!transcript) return;

                const userMessage: Message = { role: 'human', content: transcript };
                setHistory(prevHistory => {
                    const newHistory = [...prevHistory, userMessage];
                    // Check statusRef before calling backend
                    if (statusRef.current === 'listening') { // Ensure still in correct state
                        getNextAiResponse(newHistory);
                    }
                    return newHistory;
                });
            };

            recognition.onerror = (event: any) => {
                const error = event.error;
                console.error("Speech recognition error:", error);
                clearListenTimeouts(); // <<< Stop timers on error
                listeningActiveRef.current = false; // Recognition stopped

                // Only react if the error happened while we expected to be listening
                if (statusRef.current === 'listening') {
                    if (error === 'no-speech' || error === 'aborted') { // Treat timeout/abort as 'no speech' for flow
                        console.warn(`STT ended with: ${error}. Informing AI.`);
                        setStatus('waiting_for_ai'); // Ask AI to handle it
                        const systemMessage: Message = { role: 'system', content: 'User provided no speech or listening was aborted.' };
                        setHistory((prev) => {
                            const newHistory = [...prev, systemMessage];
                            getNextAiResponse(newHistory);
                            return newHistory;
                        });
                    } else if (error === 'network') {
                        console.error("Network error during speech recognition."); setStatus('error');
                    } else { // Other errors like 'audio-capture', 'not-allowed', 'service-not-allowed'
                        setStatus('error');
                    }
                } else { console.log(`Recognition error '${error}' occurred outside active listening.`); }
            };

// onend fires when recognition stops for any reason
recognition.onend = () => {
    console.log("Speech recognition ended.");
    // Important: Clear timeouts and reset flag ONLY if it wasn't already handled by onresult/onerror/abort
    if (listeningActiveRef.current) {
        console.warn("Recognition ended unexpectedly while 'listeningActiveRef' was true.");
        clearListenTimeouts(); // Clean up timers just in case
        listeningActiveRef.current = false;
        // If the status is still 'listening', it means neither onresult nor onerror handled it.
        if (statusRef.current === 'listening') {
            // This case is tricky. Maybe trigger AI to reprompt? Or set to error?
            console.error("Recognition ended without result or specific error while listening.");
            setStatus('error'); // Safer default
        }
    }
};

recognitionRef.current = recognition; // Store instance
console.log("SpeechRecognition initialized.");
setStatus('idle'); // Ready

} catch (error) { console.error("Initialization failed:", error); setStatus('error'); }
    };

initialize(); // Run initialization

// --- Cleanup Function ---
return () => { /* ... (cleanup remains the same: clear timeouts, stop services, release stream) ... */
    console.log("Cleaning up interview resources...");
    clearListenTimeouts();
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    try { recognition?.abort(); } catch (e) { /* ignore */ }
    listeningActiveRef.current = false;
    try { if (recorder?.state !== 'inactive') { recorder?.stop(); } } catch (e) { /* ignore */ }
    try { stream?.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
    console.log("Microphone access released.");
};
}, [getNextAiResponse, handleMediaRecorderStop, clearListenTimeouts]); // Stable dependencies


// --- Start Interview ---
const startInterview = useCallback(() => {
    if (statusRef.current !== 'idle') {
        console.log(`Cannot start interview from status: ${statusRef.current}`);
        return;
    }
    console.log("Starting interview...");
    // Start with an initial AI message or directly start listening
    // For now, assume we start by getting the first AI response
    getNextAiResponse([]);
}, [getNextAiResponse]);

// --- Return the hook interface ---
return {
    status,
    history,
    startInterview,
    finishInterview,
    listeningTimer,
};
};

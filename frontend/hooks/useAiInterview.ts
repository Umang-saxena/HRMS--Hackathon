'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Message, InterviewStatus, UseAiInterviewProps } from '../types/interview';

// === Constants ===
const API_URL = process.env.NEXT_PUBLIC_AI_INTERVIEW_API_URL || 'http://127.0.0.1:8001';
const LISTEN_TIMEOUT_SECONDS = 15;
const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus';
const AUDIO_FILE_EXTENSION = 'webm';

// === Return type ===
export interface UseAiInterviewReturn {
  status: InterviewStatus;
  history: Message[];
  startInterview: () => void;
  finishInterview: () => void;
  listeningTimer: number | null;
}

// === SpeechRecognition interface ===
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: ISpeechRecognition, ev: any) => any) | null;
  onend: ((this: ISpeechRecognition, ev: any) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: any) => any) | null;
  onstart: ((this: ISpeechRecognition, ev: any) => any) | null;
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
  const listeningActiveRef = useRef(false);
  const speakingRef = useRef(false);
  const statusRef = useRef<InterviewStatus>(status);
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // === Utility: Clear timers ===
  const clearListenTimeouts = useCallback(() => {
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    listenTimeoutRef.current = null;
    countdownIntervalRef.current = null;
    setListeningTimer(null);
  }, []);

  // === Speak AI text ===
  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported.');
        setStatus('error');
        return;
      }

      setStatus('speaking');
      speakingRef.current = true;
      listeningActiveRef.current = false;
      clearListenTimeouts();

      try {
        window.speechSynthesis.cancel();
      } catch {}

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';

      utterance.onend = () => {
        speakingRef.current = false;
        if (statusRef.current !== 'speaking') return;

        // Small delay to ensure audio thread released before listening
        setTimeout(() => {
          if (recognitionRef.current && !listeningActiveRef.current) {
            try {
              recognitionRef.current.start();
              console.log('🎧 Listening started...');
              setStatus('listening');
            } catch (e) {
              console.error('Recognition start() failed:', e);
              setStatus('error');
              clearListenTimeouts();
            }
          }
        }, 400);
      };

      utterance.onerror = (event: any) => {
        if (['interrupted', 'canceled'].includes(event.error)) return;
        console.error('Speech synthesis error:', event);
        setStatus('error');
        clearListenTimeouts();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('speak() failed:', e);
        setStatus('error');
        clearListenTimeouts();
      }
    },
    [clearListenTimeouts]
  );

  // === Fetch next AI response ===
  const getNextAiResponse = useCallback(
    async (currentHistory: Message[]) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      setStatus('waiting_for_ai');
      clearListenTimeouts();

      try {
        const response = await fetch(`${API_URL}/conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: jobDescription,
            resume_text: resumeText,
            history: currentHistory,
          }),
        });

        if (!response.ok) throw new Error(`API Error ${response.status}`);
        const aiMessage = (await response.json()) as Message;

        setHistory((prev) => [...prev, aiMessage]);
        speak(aiMessage.content);
      } catch (error) {
        console.error('Error fetching AI response:', error);
        setStatus('error');
      } finally {
        isFetchingRef.current = false;
      }
    },
    [jobDescription, resumeText, speak, clearListenTimeouts]
  );

  // === Upload audio and analyze ===
  const uploadAndAnalyze = useCallback(
    async (audioFile: File) => {
      const uniqueFileName = `interview-${Date.now()}.${AUDIO_FILE_EXTENSION}`;
      try {
        const { error } = await supabase.storage
          .from('resumes_and_interviews')
          .upload(uniqueFileName, audioFile, {
            contentType: `audio/${AUDIO_FILE_EXTENSION}`,
            cacheControl: '3600',
            upsert: false,
          });
        if (error) throw error;

        const response = await fetch(`${API_URL}/start-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interview_id: `interview-${Date.now()}`,
            job_title: jobTitle,
            job_description: jobDescription,
            audio_file_name: uniqueFileName,
          }),
        });

        if (!response.ok) throw new Error('Analysis API error');
        console.log('✅ Analysis triggered.');
        setStatus('finished');
      } catch (error) {
        console.error('Upload/Analysis error:', error);
        setStatus('error');
      }
    },
    [jobTitle, jobDescription]
  );

  // === MediaRecorder stop ===
  const handleMediaRecorderStop = useCallback(() => {
    if (statusRef.current !== 'processing') return;
    if (audioChunks.length === 0) {
      console.warn('No audio chunks recorded.');
      setStatus('finished');
      return;
    }
    const audioBlob = new Blob(audioChunks, { type: AUDIO_MIME_TYPE });
    const audioFile = new File(
      [audioBlob],
      `interview_audio_${Date.now()}.${AUDIO_FILE_EXTENSION}`,
      { type: AUDIO_MIME_TYPE }
    );
    setAudioChunks([]);
    uploadAndAnalyze(audioFile);
  }, [audioChunks, uploadAndAnalyze]);

  // === Finish interview ===
  const finishInterview = useCallback(() => {
    if (!['speaking', 'listening', 'waiting_for_ai'].includes(statusRef.current)) {
      console.log(`Cannot finish from status: ${statusRef.current}`);
      return;
    }
    setStatus('processing');
    clearListenTimeouts();

    try {
      window.speechSynthesis.cancel();
    } catch {}
    try {
      recognitionRef.current?.abort();
    } catch {}

    listeningActiveRef.current = false;
    speakingRef.current = false;

    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    } else if (audioChunks.length > 0) {
      handleMediaRecorderStop();
    } else {
      setStatus('finished');
    }
  }, [audioChunks, handleMediaRecorderStop, clearListenTimeouts]);

  // === Initialization ===
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let recognition: ISpeechRecognition | null = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;

    const handleNoSpeech = (reason: string) => {
      console.warn(`No speech or aborted (${reason}). Continuing...`);
      clearListenTimeouts();
      listeningActiveRef.current = false;
      setStatus('waiting_for_ai');
      const sysMsg: Message = { role: 'system', content: `User did not respond (${reason}).` };
      setHistory((prev) => {
        const newHistory = [...prev, sysMsg];
        getNextAiResponse(newHistory);
        return newHistory;
      });
    };

    const initialize = async () => {
      try {
        setStatus('starting');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const options = { mimeType: AUDIO_MIME_TYPE };
        recorder = MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
          ? new MediaRecorder(stream, options)
          : new MediaRecorder(stream);

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) setAudioChunks((prev) => [...prev, e.data]);
        };
        recorder.onstop = handleMediaRecorderStop;
        mediaRecorderRef.current = recorder;
        console.log('🎙️ MediaRecorder initialized.');

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) throw new Error('SpeechRecognition not supported.');

        recognition = new SpeechRecognition() as ISpeechRecognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          console.log('🎧 Recognition started.');
          listeningActiveRef.current = true;
          setStatus('listening');
          setListeningTimer(LISTEN_TIMEOUT_SECONDS);

          countdownIntervalRef.current = setInterval(() => {
            setListeningTimer((t) => (t && t > 0 ? t - 1 : 0));
          }, 1000);

          listenTimeoutRef.current = setTimeout(() => {
            if (statusRef.current === 'listening') handleNoSpeech('timeout');
          }, LISTEN_TIMEOUT_SECONDS * 1000);
        };

        recognition.onresult = (event: any) => {
          clearListenTimeouts();
          listeningActiveRef.current = false;
          const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
          console.log('🗣️ Transcript:', transcript);
          if (!transcript) return handleNoSpeech('empty');

          const userMsg: Message = { role: 'human', content: transcript };
          setHistory((prev) => {
            const newHist = [...prev, userMsg];
            getNextAiResponse(newHist);
            return newHist;
          });
        };

        recognition.onerror = (event: any) => {
          console.error('Recognition error:', event.error);
          listeningActiveRef.current = false;
          clearListenTimeouts();
          if (['no-speech', 'aborted'].includes(event.error)) handleNoSpeech(event.error);
          else setStatus('error');
        };

        recognition.onend = () => {
          if (statusRef.current === 'listening') handleNoSpeech('ended');
        };

        recognitionRef.current = recognition;
        console.log('✅ SpeechRecognition initialized.');
        setStatus('idle');
      } catch (error) {
        console.error('Initialization failed:', error);
        setStatus('error');
      }
    };

    initialize();

    return () => {
      clearListenTimeouts();
      recognition?.abort();
      window.speechSynthesis.cancel();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [getNextAiResponse, handleMediaRecorderStop, clearListenTimeouts]);

  // === Start Interview ===
  const startInterview = useCallback(() => {
    if (['idle', 'finished', 'error'].includes(statusRef.current)) {
      setHistory([]);
      setAudioChunks([]);
      setStatus('starting');
      console.log('🚀 Starting interview...');
      getNextAiResponse([]);
    } else {
      console.warn(`Cannot start interview in status: ${statusRef.current}`);
    }
  }, [getNextAiResponse]);

  return { status, history, startInterview, finishInterview, listeningTimer };
};

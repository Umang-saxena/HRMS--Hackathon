export interface Message {
    role: 'ai' | 'human' | 'system';
    content: string;
}

export type InterviewStatus =
    | 'idle'
    | 'starting'
    | 'waiting_for_ai'
    | 'speaking'
    | 'listening'
    | 'processing'
    | 'finished'
    | 'error';

export interface UseAiInterviewProps {
    jobDescription: string;
    resumeText: string;
    jobTitle: string;
}

export interface UseAiInterviewReturn {
    status: InterviewStatus;
    history: Message[];
    startInterview: () => void;
    finishInterview: () => void;
    listeningTimer: number | null;
}

// Extend the global Window interface to include SpeechRecognition if needed
declare global {
    interface Window {
        SpeechRecognition?: any; // Use 'any' for simplicity or install @types/dom-speech-recognition
        webkitSpeechRecognition?: any;
    }
}
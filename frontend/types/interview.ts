export interface Message {
  role: 'ai' | 'human' | 'system'; // Added system role
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

// Extend the global Window interface
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
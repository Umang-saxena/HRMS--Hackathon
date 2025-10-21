'use client';
import { useAiInterview } from '../hooks/useAiInterview'; // Adjust path if needed
import type { UseAiInterviewProps } from '../types/interview'; // Adjust path
import React from 'react'; // Import React for CSSProperties type

// Define props type for the component
interface AiInterviewClientProps extends UseAiInterviewProps {}

export default function AiInterviewClient({ jobDescription, resumeText, jobTitle }: AiInterviewClientProps) {
  // Use our custom hook to get all the logic and state
  const { status, history, startInterview, finishInterview, listeningTimer } = useAiInterview({
    jobDescription,
    resumeText,
    jobTitle,
  });

  const getStatusMessage = (): string => {
    // Provides user-friendly status updates
    switch (status) {
      case 'idle': return 'Ready to start the interview.';
      case 'starting': return 'Initializing... Requesting microphone...';
      case 'waiting_for_ai': return 'Alex (AI) is thinking...';
      case 'speaking': return 'Alex (AI) is speaking...';
      case 'listening': return 'Listening for your answer... Please speak clearly.';
      case 'processing': return 'Interview finished. Uploading audio and processing analysis... Please wait.';
      case 'finished': return 'Analysis complete! Results will be available on the dashboard.';
      case 'error': return 'An error occurred. Please check the console or try again.';
      default: return 'Initializing...';
    }
  };

  // Determine if buttons should be disabled based on status
  const isInterviewActive = ['waiting_for_ai', 'speaking', 'listening'].includes(status);
  const canStart = ['idle', 'finished', 'error'].includes(status);

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1>AI Interview</h1>
      <p><strong>Status:</strong> {getStatusMessage()}</p>

      {/* --- Listening Timer Display --- */}
      {status === 'listening' && listeningTimer !== null && (
        <p style={{ color: 'orange', fontWeight: 'bold', fontSize: '1.1em' }}>
          Listening... Time remaining: {listeningTimer}s
        </p>
      )}

      {/* --- Action Buttons --- */}
      <button onClick={startInterview} style={buttonStyle} disabled={!canStart}>
        {status === 'idle' ? 'Start Interview' : 'Start New Interview'}
      </button>

      <button
        onClick={finishInterview}
        style={{ ...buttonStyle, backgroundColor: '#c0392b' /* Red */ }}
        disabled={!isInterviewActive} // Disable if not actively interviewing
      >
        End Interview & Analyze
      </button>


      {/* --- Transcript Box --- */}
      <div style={transcriptBoxStyle}>
        {history.length === 0 && (status === 'idle' || status === 'starting') && (
          <p style={{ color: '#888', textAlign: 'center' }}>Click "Start Interview" to begin...</p>
        )}
        {history.map((msg, idx) => (
          <div key={idx} style={messageStyle(msg.role)}>
            <strong>{msg.role === 'ai' ? 'Alex (AI)' : msg.role === 'human' ? 'You' : 'System'}:</strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          </div>
        ))}
         {/* Show indicators based on status */}
         {status === 'listening' && (
           <div style={messageStyle('human')}>
             <strong>You:</strong>
             <p style={{ margin: 0, fontStyle: 'italic', color: '#555' }}>Listening...</p>
           </div>
        )}
        {status === 'waiting_for_ai' && <p style={{ fontStyle: 'italic', color: '#555', textAlign: 'center' }}>Alex (AI) is thinking...</p>}
        {status === 'processing' && <p style={{ fontStyle: 'italic', color: '#555', textAlign: 'center' }}>Processing your interview... This might take a minute.</p>}
        {status === 'error' && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>❌ An error occurred. Please check the browser console.</p>}
      </div>
    </div>
  );
}

// ======================================================
// 🎨 Basic Styles (CSS-in-JS)
// ======================================================
const buttonStyle: React.CSSProperties = {
  padding: '12px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  backgroundColor: '#27ae60', // Green
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  marginRight: '10px',
  transition: 'background-color 0.2s ease, opacity 0.2s ease',
  opacity: 1,
};

// Add pseudo-selector styles using CSS or a library if needed for hover/disabled
// e.g., button:disabled { opacity: 0.6; cursor: not-allowed; }

const transcriptBoxStyle: React.CSSProperties = {
  height: '400px',
  overflowY: 'auto',
  border: '1px solid #ccc',
  borderRadius: '5px',
  padding: '15px',
  marginTop: '20px',
  backgroundColor: '#f9f9f9',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
};

const messageStyle = (role: 'ai' | 'human' | 'system'): React.CSSProperties => ({
  marginBottom: '12px',
  padding: '10px 15px',
  borderRadius: '10px',
  maxWidth: '85%',
  wordWrap: 'break-word',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  // Styling based on role
  backgroundColor: role === 'ai' ? '#ecf0f1' : role === 'human' ? '#dcf8c6' : '#fffbe6', // System: light yellow
  color: role === 'system' ? '#8a6d3b' : '#333', // System: darker yellow text
  fontStyle: role === 'system' ? 'italic' : 'normal',
  textAlign: role === 'ai' || role === 'system' ? 'left' : 'right', // Align system left
  marginLeft: role === 'ai' || role === 'system' ? 0 : 'auto',
  marginRight: role === 'ai' || role === 'system' ? 'auto' : 0,
});
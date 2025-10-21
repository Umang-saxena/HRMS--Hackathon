'use client';
import { useState, useEffect } from 'react';
import { useAiInterview } from '@/hooks/useAiInterview';
import Layout from '@/components/layout/CandidateLayout';
import { InterviewStatus } from '@/types/interview';

export default function InterviewPage() {
  const { history, status, startInterview, finishInterview, listeningTimer } = useAiInterview({
    jobDescription: "We are looking for a skilled software engineer who can work on our full-stack applications.",
    resumeText: "Experienced software engineer with 5 years of experience in full-stack development.",
    jobTitle: "Senior Software Engineer"
  });

  return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900/50 rounded-xl p-8">
        <div className="max-w-2xl w-full bg-gray-900 rounded-2xl p-6 shadow-xl space-y-4">
          <h1 className="text-2xl font-bold text-center mb-4">🎤 AI Interview</h1>

          <div className="bg-gray-800 p-4 rounded-lg h-96 overflow-y-auto">
            {history.map((msg, i) => (
              <div
                key={i}
                className={`my-2 p-2 rounded-lg ${
                  msg.role === 'ai'
                    ? 'bg-blue-900/50 text-blue-200 self-start'
                    : msg.role === 'human'
                    ? 'bg-green-900/50 text-green-200 self-end'
                    : 'bg-gray-700 text-gray-200 italic text-sm'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {status === 'listening' && (
            <div className="text-center text-yellow-400 font-medium">
              Listening... ⏳ {listeningTimer}s remaining
            </div>
          )}

          {status === 'speaking' && (
            <div className="text-center text-blue-400">AI is speaking...</div>
          )}

          {status === 'waiting_for_ai' && (
            <div className="text-center text-gray-400">Processing your response...</div>
          )}

          {status === 'starting' && (
            <div className="text-center text-yellow-400">Initializing interview...</div>
          )}

          {status === 'error' && (
            <div className="text-center text-red-400">An error occurred. Please try again.</div>
          )}

          <div className="flex gap-4 justify-center mt-4">
            <button
              onClick={startInterview}
              disabled={status !== 'idle' && status !== 'finished'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-40"
            >
              ▶ Start Interview
            </button>
            <button
              onClick={finishInterview}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              ⏹ Finish
            </button>
          </div>
        </div>
      </div>
  );
}

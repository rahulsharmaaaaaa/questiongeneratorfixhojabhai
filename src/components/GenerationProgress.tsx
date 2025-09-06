import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface GenerationProgressProps {
  isGenerating: boolean;
  currentQuestion: number;
  totalQuestions: number;
  currentTopic?: string;
  currentProgress: string;
  error?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ 
  isGenerating,
  currentQuestion,
  totalQuestions,
  currentTopic,
  error,
  currentProgress 
}) => {
  const progress = totalQuestions > 0 ? (currentQuestion / totalQuestions) * 100 : 0;

  if (!isGenerating && currentQuestion === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center gap-3 mb-4">
        {error ? (
          <AlertCircle className="w-6 h-6 text-red-500" />
        ) : isGenerating ? (
          <Clock className="w-6 h-6 text-blue-500 animate-spin" />
        ) : (
          <CheckCircle className="w-6 h-6 text-green-500" />
        )}
        
        <div>
          <h3 className="font-semibold text-gray-900">
            {error ? 'Generation Error' : isGenerating ? 'Generating Questions...' : 'Generation Complete'}
          </h3>
          <p className="text-sm text-gray-600">
            {error ? error : `${currentQuestion} of ${totalQuestions} questions`}
          </p>
        </div>
      </div>

      {!error && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {currentProgress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">{currentProgress}</p>
            </div>
          )}

          {currentTopic && (
            <p className="text-sm text-gray-600">
              Current topic: <span className="font-medium">{currentTopic}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default GenerationProgress;
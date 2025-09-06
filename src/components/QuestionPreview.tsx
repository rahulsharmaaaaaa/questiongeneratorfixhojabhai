import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface QuestionPreviewProps {
  question: {
    question_statement: string;
    options?: string[];
    answer?: string;
    solution?: string;
    question_type: string;
  };
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({ question }) => {
  const renderMathContent = (content: string) => {
    if (!content) return null;

    // Split content by math delimiters
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const mathContent = part.slice(2, -2);
        return <BlockMath key={index} math={mathContent} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const mathContent = part.slice(1, -1);
        return <InlineMath key={index} math={mathContent} />;
      } else {
        // Regular text
        return <span key={index}>{part}</span>;
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
            {question.question_type}
          </span>
        </div>
        
        <div className="text-gray-900 mb-4">
          <strong>Question:</strong>
          <div className="mt-2">
            {renderMathContent(question.question_statement)}
          </div>
        </div>

        {question.options && question.options.length > 0 && (
          <div className="mb-4">
            <strong>Options:</strong>
            <div className="mt-2 space-y-2">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="font-medium text-gray-600">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <div>{renderMathContent(option)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {question.answer && (
          <div className="mb-4">
            <strong>Answer:</strong>
            <div className="mt-1 text-green-700 font-medium">
              {renderMathContent(question.answer)}
            </div>
          </div>
        )}

        {question.solution && (
          <div>
            <strong>Solution:</strong>
            <div className="mt-2 text-gray-700">
              {renderMathContent(question.solution)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPreview;
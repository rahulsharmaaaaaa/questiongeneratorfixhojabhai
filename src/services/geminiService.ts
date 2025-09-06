import { QuestionType, QuestionConfig, Topic, QuestionTopicWise } from '../types/database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;

  setApiKeys(keys: string[]) {
    this.apiKeys = keys.filter(key => key.trim() !== '');
    this.currentKeyIndex = 0;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys configured');
    }

    let lastError: Error | null = null;
    
    // Try each API key
    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      const apiKey = this.apiKeys[this.currentKeyIndex];
      
      try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (response.ok) {
          const data: GeminiResponse = await response.json();
          return data.candidates[0]?.content?.parts[0]?.text || '';
        } else {
          throw new Error(`Gemini API error: ${response.status}`);
        }
      } catch (error) {
        console.error(`API key ${this.currentKeyIndex + 1} failed:`, error);
        lastError = error as Error;
        
        // Move to next API key
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        
        // Add delay before trying next key
        if (attempt < this.apiKeys.length - 1) {
          await this.delay(1000);
        }
      }
    }
    
    throw lastError || new Error('All API keys failed');
  }

  private async callGeminiAPIOriginal(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKeys[this.currentKeyIndex]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  async generateNewQuestion(
    examName: string,
    courseName: string,
    subjectName: string,
    topic: Topic,
    questionType: QuestionType,
    config: QuestionConfig,
    slot?: string,
    part?: string,
    existingQuestions: QuestionTopicWise[] = [],
    generatedQuestions: any[] = []
  ): Promise<any> {
    const existingQuestionsText = existingQuestions.length > 0 
      ? existingQuestions.map(q => `Question: ${q.question_statement}\nOptions: ${q.options?.join(', ')}`).join('\n\n')
      : 'No previous year questions available for this topic.';

    const generatedQuestionsText = generatedQuestions.length > 0
      ? generatedQuestions.map(q => `Generated Question: ${q.question_statement}`).join('\n\n')
      : '';

    const prompt = `You are a professor of ${examName} exam for the ${courseName} course, specifically teaching ${subjectName} subject.

Topic: ${topic.name}
Topic Description: ${topic.description || 'No description available'}
Topic Notes: ${topic.notes || 'No notes available'}

Previous Year Questions for this topic:
${existingQuestionsText}

${generatedQuestionsText ? `Previously Generated Questions (DO NOT REPEAT):\n${generatedQuestionsText}\n` : ''}

Generate a NEW ${questionType} question for this topic that:
1. Follows the pattern and difficulty level of previous year questions
2. Is completely original and not a copy of existing questions
3. Tests the core concepts from the topic notes
4. Uses proper KaTeX formatting for all mathematical expressions, formulas, tables, and diagrams
   IMPORTANT: In JSON strings, ALL backslashes must be double-escaped (e.g., use "\\\\frac{1}{2}" not "\\frac{1}{2}")
5. Has the appropriate difficulty level for ${examName}

Question Type: ${questionType}
${questionType === 'MCQ' ? 'Single correct answer' : ''}
${questionType === 'MSQ' ? 'Multiple correct answers possible' : ''}
${questionType === 'NAT' ? 'Numerical answer (provide exact numerical value)' : ''}
${questionType === 'Subjective' ? 'Descriptive answer required' : ''}

Marking Scheme:
- Correct: ${config.correctMarks} marks
- Incorrect: ${config.incorrectMarks} marks
- Skipped: ${config.skippedMarks} marks
- Partial: ${config.partialMarks} marks
- Time: ${config.timeMinutes} minutes

${slot ? `Slot: ${slot}` : ''}
${part ? `Part: ${part}` : ''}

Return ONLY a valid JSON object with this exact structure:
{
  "question_statement": "Question text with KaTeX formatting (remember to double-escape backslashes)",
  "options": ${questionType === 'MCQ' || questionType === 'MSQ' ? '["Option A", "Option B", "Option C", "Option D"]' : 'null'},
  "answer": "${questionType === 'NAT' ? 'numerical_value' : questionType === 'Subjective' ? 'descriptive_answer' : 'correct_option_letters_like_A_or_AB'}",
  "solution": "Detailed step-by-step solution with KaTeX formatting (remember to double-escape backslashes)",
  "difficulty_level": "Easy|Medium|Hard"
}

CRITICAL: In the JSON response, all backslashes in KaTeX expressions must be double-escaped for valid JSON:
- Use "\\\\frac{1}{2}" instead of "\\frac{1}{2}"
- Use "\\\\sqrt{x}" instead of "\\sqrt{x}"
- Use "\\\\int" instead of "\\int"
This is essential for proper JSON parsing.`;

    const response = await this.callGeminiAPI(prompt);
    
    let cleanedResponse = '';
    
    try {
      // First, try to extract JSON from markdown code block
      const markdownJsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (markdownJsonMatch) {
        cleanedResponse = markdownJsonMatch[1];
      } else {
        // Fall back to finding the first complete JSON object
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }
        cleanedResponse = jsonMatch[0];
      }
      
      // Clean up any remaining markdown or extra characters
      cleanedResponse = cleanedResponse.trim();
      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      return {
        topic_id: topic.id,
        topic_name: topic.name,
        question_statement: parsedResponse.question_statement,
        question_type: questionType,
        options: parsedResponse.options,
        answer: parsedResponse.answer,
        solution: parsedResponse.solution,
        difficulty_level: parsedResponse.difficulty_level || 'Medium',
        slot: slot || null,
        part: part || null,
        correct_marks: config.correctMarks,
        incorrect_marks: config.incorrectMarks,
        skipped_marks: config.skippedMarks,
        partial_marks: config.partialMarks,
        time_minutes: config.timeMinutes,
        purpose: 'Generated',
        chapter_id: topic.chapter_id
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.log('Raw response:', response);
      console.log('Cleaned response:', cleanedResponse);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  async generatePYQSolution(
    examName: string,
    courseName: string,
    subjectName: string,
    question: QuestionTopicWise,
    topic: Topic
  ): Promise<string> {
    const prompt = `You are a professor of ${examName} exam for the ${courseName} course, specifically teaching ${subjectName} subject.

Topic: ${topic.name}
Topic Notes: ${topic.notes || 'No notes available'}

Previous Year Question:
Question: ${question.question_statement}
${question.options ? `Options: ${question.options.join(', ')}` : ''}
Question Type: ${question.question_type}

Generate a detailed solution for this previous year question that:
1. Uses the concepts and methods from the topic notes
2. Provides step-by-step explanation
3. Uses proper KaTeX formatting for all mathematical expressions
4. Explains the key concepts behind the solution
5. Shows the complete working

Structure your solution as:
1. Answer: [Direct answer]
2. Solution: [Step-by-step working]
3. Key Concept: [Explanation of the underlying concept]

Use KaTeX syntax for all mathematical expressions (e.g., \\frac{1}{2}, \\sqrt{x}, \\int, etc.).

Provide the complete detailed solution:`;

    return await this.callGeminiAPI(prompt);
  }

  // Add delay to prevent rate limiting
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const geminiService = new GeminiService();
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { BookOpen, Brain, FileText, Play, BarChart3, Key, Square } from 'lucide-react';
import { databaseService } from './services/databaseService';
import { geminiService } from './services/geminiService';
import { 
  Exam, 
  Course, 
  Topic, 
  Slot, 
  Part, 
  QuestionType, 
  QuestionConfig,
  GenerationStats 
} from './types/database';
import QuestionPreview from './components/QuestionPreview';
import GenerationProgress from './components/GenerationProgress';

const defaultQuestionConfigs: Record<QuestionType, QuestionConfig> = {
  MCQ: { type: 'MCQ', enabled: true, correctMarks: 4, incorrectMarks: -1, skippedMarks: 0, partialMarks: 0, timeMinutes: 3 },
  MSQ: { type: 'MSQ', enabled: true, correctMarks: 4, incorrectMarks: -2, skippedMarks: 0, partialMarks: 1, timeMinutes: 3 },
  NAT: { type: 'NAT', enabled: true, correctMarks: 4, incorrectMarks: 0, skippedMarks: 0, partialMarks: 0, timeMinutes: 3 },
  Subjective: { type: 'Subjective', enabled: true, correctMarks: 10, incorrectMarks: 0, skippedMarks: 0, partialMarks: 2, timeMinutes: 15 }
};

function App() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  
  const [generationMode, setGenerationMode] = useState<'questions' | 'solutions'>('questions');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('MCQ');
  const [questionConfigs, setQuestionConfigs] = useState<Record<QuestionType, QuestionConfig>>(defaultQuestionConfigs);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(30);
  const [apiKeys, setApiKeys] = useState<string[]>([
    'AIzaSyADzQpjE3NTp2N40iSHeDAVMVp9viNZ-UY',
    'AIzaSyAIb8_yMe4eBJi0zM-ltIr36VpbIYBrduE',
    '',
    '',
    ''
  ]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState<GenerationStats>({ newQuestions: 0, pyqSolutions: 0 });
  const [currentProgress, setCurrentProgress] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadCourses(selectedExam.id);
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedCourse) {
      loadTopics(selectedCourse.id);
      loadSlots(selectedCourse.id);
      loadParts(selectedCourse.id);
      loadStats(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadExams = async () => {
    try {
      const data = await databaseService.getExams();
      setExams(data);
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  };

  const loadCourses = async (examId: string) => {
    try {
      const data = await databaseService.getCoursesByExam(examId);
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadTopics = async (courseId: string) => {
    try {
      const data = await databaseService.getTopicsByCourse(courseId);
      setTopics(data);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadSlots = async (courseId: string) => {
    try {
      const data = await databaseService.getSlotsByCourse(courseId);
      setSlots(data);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const loadParts = async (courseId: string) => {
    try {
      const data = await databaseService.getPartsByCourse(courseId);
      setParts(data);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const loadStats = async (courseId: string) => {
    try {
      const data = await databaseService.getGenerationStats(courseId);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateQuestionConfig = (type: QuestionType, field: keyof QuestionConfig, value: any) => {
    setQuestionConfigs(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const startGeneration = async () => {
    if (isGenerating) return;
    
    if (!selectedExam || !selectedCourse || topics.length === 0) {
      setError('Please select exam, course, and ensure topics are available');
      return;
    }

    setIsGenerating(true);
    setShouldStop(false);
    setCurrentQuestion(0);
    setError('');
    setGeneratedQuestions([]);
    setCurrentProgress('');
    
    // Set API keys in gemini service
    geminiService.setApiKeys(apiKeys);

    try {
      if (generationMode === 'questions') {
        await generateNewQuestions();
      } else {
        await generatePYQSolutions();
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during generation');
    } finally {
      setIsGenerating(false);
      setShouldStop(false);
      setCurrentProgress('');
      if (selectedCourse) {
        loadStats(selectedCourse.id);
      }
    }
  };

  const stopGeneration = () => {
    setShouldStop(true);
  };

  const generateNewQuestions = async () => {
    const config = questionConfigs[selectedQuestionType];
    const questionsPerTopic = Math.ceil(numberOfQuestions / topics.length);
    let questionCount = 0;
    let topicIndex = 0;
    const generated: any[] = [];

    while (questionCount < numberOfQuestions && topicIndex < topics.length) {
      if (shouldStop) {
        setCurrentProgress('Generation stopped by user');
        break;
      }
      
      const topic = topics[topicIndex];
      setCurrentTopic(topic.name);
      setCurrentProgress(`Generating question ${questionCount + 1} of ${numberOfQuestions} for topic: ${topic.name}`);

      try {
        // Get existing PYQs for context
        const existingPYQs = await databaseService.getPYQsByTopic(topic.id);
        
        // Get subject info
        const subject = await databaseService.getSubjectByTopicId(topic.id);
        
        const question = await geminiService.generateNewQuestion(
          selectedExam.name,
          selectedCourse.name,
          subject?.name || 'Unknown Subject',
          topic,
          selectedQuestionType,
          config,
          selectedSlot?.slot_name,
          selectedPart?.part_name,
          existingPYQs,
          generated
        );

        // Save to database
        const savedQuestion = await databaseService.saveNewQuestion(question);
        generated.push(savedQuestion);
        setGeneratedQuestions(prev => [...prev, savedQuestion]);
        
        questionCount++;
        setCurrentQuestion(questionCount);

        // Delay to prevent rate limiting
        await geminiService.delay(8000); // Increased delay to 8 seconds

      } catch (error) {
        console.error(`Error generating question for topic ${topic.name}:`, error);
      }

      // Move to next topic (round-robin)
      topicIndex = (topicIndex + 1) % topics.length;
      
      // If we've gone through all topics once, start over
      if (topicIndex === 0 && questionCount < numberOfQuestions) {
        // Continue with the same topics
      }
    }
  };

  const generatePYQSolutions = async () => {
    let solutionCount = 0;
    let topicIndex = 0;

    while (solutionCount < numberOfQuestions && topicIndex < topics.length) {
      if (shouldStop) {
        setCurrentProgress('Generation stopped by user');
        break;
      }
      
      const topic = topics[topicIndex];
      setCurrentTopic(topic.name);
      setCurrentProgress(`Generating solution ${solutionCount + 1} of ${numberOfQuestions} for topic: ${topic.name}`);

      try {
        // Get unsolved PYQs for this topic
        const unsolvedPYQs = await databaseService.getUnsolvedPYQsByTopic(topic.id);
        
        if (unsolvedPYQs.length > 0) {
          const question = unsolvedPYQs[0]; // Take the first unsolved question
          
          // Get subject info
          const subject = await databaseService.getSubjectByTopicId(topic.id);
          
          const solution = await geminiService.generatePYQSolution(
            selectedExam.name,
            selectedCourse.name,
            subject?.name || 'Unknown Subject',
            question,
            topic
          );

          // Update the question with solution
          await databaseService.updatePYQSolution(question.id, solution);
          
          solutionCount++;
          setCurrentQuestion(solutionCount);

          // Delay to prevent rate limiting
          await geminiService.delay(8000); // Increased delay to 8 seconds
        }

      } catch (error) {
        console.error(`Error generating solution for topic ${topic.name}:`, error);
      }

      topicIndex = (topicIndex + 1) % topics.length;
    }
  };

  const handleApiKeyChange = (index: number, value: string) => {
    const newApiKeys = [...apiKeys];
    newApiKeys[index] = value;
    setApiKeys(newApiKeys);
  };

  const examOptions = exams.map(exam => ({ value: exam.id, label: exam.name, data: exam }));
  const courseOptions = courses.map(course => ({ value: course.id, label: course.name, data: course }));
  const slotOptions = slots.map(slot => ({ value: slot.id, label: slot.slot_name, data: slot }));
  const partOptions = parts.map(part => ({ value: part.id, label: part.part_name, data: part }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Question Generator</h1>
          </div>

          {/* Selection Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Select Exam
              </label>
              <Select
                options={examOptions}
                value={selectedExam ? { value: selectedExam.id, label: selectedExam.name } : null}
                onChange={(option) => setSelectedExam(option?.data || null)}
                placeholder="Choose an exam..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Select Course
              </label>
              <Select
                options={courseOptions}
                value={selectedCourse ? { value: selectedCourse.id, label: selectedCourse.name } : null}
                onChange={(option) => setSelectedCourse(option?.data || null)}
                placeholder="Choose a course..."
                isDisabled={!selectedExam}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slot (Optional)
              </label>
              <Select
                options={slotOptions}
                value={selectedSlot ? { value: selectedSlot.id, label: selectedSlot.slot_name } : null}
                onChange={(option) => setSelectedSlot(option?.data || null)}
                placeholder="Select a slot..."
                isDisabled={!selectedCourse}
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part (Optional)
              </label>
              <Select
                options={partOptions}
                value={selectedPart ? { value: selectedPart.id, label: selectedPart.part_name } : null}
                onChange={(option) => setSelectedPart(option?.data || null)}
                placeholder="Select a part..."
                isDisabled={!selectedCourse}
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* API Keys Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2 text-indigo-600" />
              Gemini API Keys Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apiKeys.map((key, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key {index + 1}
                  </label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => handleApiKeyChange(index, e.target.value)}
                    placeholder={`Enter API Key ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              The system will automatically switch to the next API key if one fails. At least one API key is required.
            </p>
          </div>

          {/* Generation Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Generation Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="questions"
                  checked={generationMode === 'questions'}
                  onChange={(e) => setGenerationMode(e.target.value as 'questions' | 'solutions')}
                  className="mr-2"
                />
                Generate New Questions
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="solutions"
                  checked={generationMode === 'solutions'}
                  onChange={(e) => setGenerationMode(e.target.value as 'questions' | 'solutions')}
                  className="mr-2"
                />
                Generate PYQ Solutions
              </label>
            </div>
          </div>

          {/* Question Type Selection (only for new questions) */}
          {generationMode === 'questions' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Question Type</label>
              <select
                value={selectedQuestionType}
                onChange={(e) => setSelectedQuestionType(e.target.value as QuestionType)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MCQ">MCQ (Single Correct)</option>
                <option value="MSQ">MSQ (Multiple Correct)</option>
                <option value="NAT">NAT (Numerical Answer)</option>
                <option value="Subjective">Subjective (Descriptive)</option>
              </select>
            </div>
          )}

          {/* Question Configuration (only for new questions) */}
          {generationMode === 'questions' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Configuration</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Correct Marks</label>
                    <input
                      type="number"
                      value={questionConfigs[selectedQuestionType].correctMarks}
                      onChange={(e) => updateQuestionConfig(selectedQuestionType, 'correctMarks', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Incorrect Marks</label>
                    <input
                      type="number"
                      value={questionConfigs[selectedQuestionType].incorrectMarks}
                      onChange={(e) => updateQuestionConfig(selectedQuestionType, 'incorrectMarks', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Skipped Marks</label>
                    <input
                      type="number"
                      value={questionConfigs[selectedQuestionType].skippedMarks}
                      onChange={(e) => updateQuestionConfig(selectedQuestionType, 'skippedMarks', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Partial Marks</label>
                    <input
                      type="number"
                      value={questionConfigs[selectedQuestionType].partialMarks}
                      onChange={(e) => updateQuestionConfig(selectedQuestionType, 'partialMarks', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time (min)</label>
                    <input
                      type="number"
                      value={questionConfigs[selectedQuestionType].timeMinutes}
                      onChange={(e) => updateQuestionConfig(selectedQuestionType, 'timeMinutes', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Number of Questions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of {generationMode === 'questions' ? 'Questions' : 'Solutions'} to Generate
            </label>
            <input
              type="number"
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
              min="1"
              max="1000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {topics.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Will generate approximately {Math.ceil(numberOfQuestions / topics.length)} {generationMode === 'questions' ? 'questions' : 'solutions'} per topic ({topics.length} topics available)
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">New Questions Generated</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.newQuestions}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">PYQ Solutions Generated</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.pyqSolutions}</p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between mb-4">
            {isGenerating && (
              <button
                onClick={stopGeneration}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Generation
              </button>
            )}
          </div>

          <button
            onClick={startGeneration}
            disabled={!selectedExam || !selectedCourse || topics.length === 0 || isGenerating || apiKeys.filter(k => k.trim()).length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Generate {generationMode === 'questions' ? 'Questions' : 'Solutions'}
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        <GenerationProgress
          isGenerating={isGenerating}
          currentQuestion={currentQuestion}
          totalQuestions={numberOfQuestions}
          currentTopic={currentTopic}
          error={error}
          currentProgress={currentProgress}
        />

        {/* Generated Questions Preview */}
        {generatedQuestions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Questions</h2>
            <div className="space-y-6">
              {generatedQuestions.slice(-3).map((question, index) => (
                <QuestionPreview key={question.id} question={question} />
              ))}
              {generatedQuestions.length > 3 && (
                <p className="text-center text-gray-600">
                  Showing last 3 questions. Total generated: {generatedQuestions.length}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
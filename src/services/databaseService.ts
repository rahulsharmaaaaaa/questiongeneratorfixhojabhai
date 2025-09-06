import { supabase } from '../lib/supabase';
import { 
  Exam, 
  Course, 
  Subject, 
  Topic, 
  Slot, 
  Part, 
  QuestionTopicWise, 
  NewQuestion,
  GenerationStats 
} from '../types/database';

export class DatabaseService {
  async getExams(): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getCoursesByExam(examId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('exam_id', examId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getSubjectsByCourse(courseId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('course_id', courseId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getTopicsByCourse(courseId: string): Promise<Topic[]> {
    const { data, error } = await supabase
      .from('topics')
      .select(`
        *,
        chapters!inner(
          *,
          units!inner(
            *,
            subjects!inner(
              course_id
            )
          )
        )
      `)
      .eq('chapters.units.subjects.course_id', courseId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getSlotsByCourse(courseId: string): Promise<Slot[]> {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('course_id', courseId)
      .order('slot_name');
    
    if (error) throw error;
    return data || [];
  }

  async getPartsByCourse(courseId: string): Promise<Part[]> {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('course_id', courseId)
      .order('part_name');
    
    if (error) throw error;
    return data || [];
  }

  async getPYQsByTopic(topicId: string): Promise<QuestionTopicWise[]> {
    const { data, error } = await supabase
      .from('questions_topic_wise')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async saveNewQuestion(question: Omit<NewQuestion, 'id' | 'created_at' | 'updated_at'>): Promise<NewQuestion> {
    const { data, error } = await supabase
      .from('new_questions')
      .insert(question)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updatePYQSolution(questionId: string, solution: string): Promise<void> {
    const { error } = await supabase
      .from('questions_topic_wise')
      .update({ 
        solution,
        solution_done: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);
    
    if (error) throw error;
  }

  async getGenerationStats(courseId: string): Promise<GenerationStats> {
    // Get topics for this course
    const topics = await this.getTopicsByCourse(courseId);
    const topicIds = topics.map(t => t.id);

    // Count new questions
    const { count: newQuestions } = await supabase
      .from('new_questions')
      .select('*', { count: 'exact', head: true })
      .in('topic_id', topicIds);

    // Count PYQ solutions
    const { count: pyqSolutions } = await supabase
      .from('questions_topic_wise')
      .select('*', { count: 'exact', head: true })
      .in('topic_id', topicIds)
      .eq('solution_done', true);

    return {
      newQuestions: newQuestions || 0,
      pyqSolutions: pyqSolutions || 0
    };
  }

  async getTopicById(topicId: string): Promise<Topic | null> {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .single();
    
    if (error) return null;
    return data;
  }

  async getSubjectByTopicId(topicId: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('topics')
      .select(`
        chapters!inner(
          units!inner(
            subjects!inner(*)
          )
        )
      `)
      .eq('id', topicId)
      .single();
    
    if (error) return null;
    return data?.chapters?.units?.subjects || null;
  }

  async getUnsolvedPYQsByTopic(topicId: string): Promise<QuestionTopicWise[]> {
    const { data, error } = await supabase
      .from('questions_topic_wise')
      .select('*')
      .eq('topic_id', topicId)
      .eq('solution_done', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}

export const databaseService = new DatabaseService();
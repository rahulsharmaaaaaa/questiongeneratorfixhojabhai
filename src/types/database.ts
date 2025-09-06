export interface Exam {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  exam_id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  course_id?: string;
  name: string;
  description?: string;
  slots?: string;
  parts?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  subject_id?: string;
  name: string;
  description?: string;
  slots?: string;
  parts?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  unit_id?: string;
  course_id?: string;
  name: string;
  description?: string;
  notes?: string;
  short_notes?: string;
  slots?: string;
  parts?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Topic {
  id: string;
  chapter_id?: string;
  name: string;
  description?: string;
  notes?: string;
  short_notes?: string;
  slots?: string;
  parts?: string;
  weightage?: number;
  is_notes_done?: boolean;
  is_short_notes_done?: boolean;
  is_mcq_done?: boolean;
  is_msq_done?: boolean;
  is_nat_done?: boolean;
  is_sub_done?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Slot {
  id: string;
  slot_name: string;
  course_id?: string;
}

export interface Part {
  id: string;
  part_name: string;
  course_id?: string;
}

export interface QuestionTopicWise {
  id: string;
  question_id?: string;
  topic_id?: string;
  topic_name?: string;
  question_statement?: string;
  question_type?: string;
  options?: string[];
  answer?: string;
  solution?: string;
  year?: number;
  slot?: string;
  part?: string;
  correct_marks?: number;
  incorrect_marks?: number;
  skipped_marks?: number;
  partial_marks?: number;
  time_minutes?: number;
  is_primary?: boolean;
  confidence_score?: number;
  answer_done?: boolean;
  solution_done?: boolean;
  chapter_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NewQuestion {
  id: string;
  topic_id?: string;
  topic_name: string;
  question_statement: string;
  question_type: string;
  options?: string[];
  answer?: string;
  solution?: string;
  difficulty_level?: string;
  slot?: string;
  part?: string;
  correct_marks?: number;
  incorrect_marks?: number;
  skipped_marks?: number;
  partial_marks?: number;
  time_minutes?: number;
  purpose?: string;
  chapter_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT' | 'Subjective';

export interface QuestionConfig {
  type: QuestionType;
  enabled: boolean;
  correctMarks: number;
  incorrectMarks: number;
  skippedMarks: number;
  partialMarks: number;
  timeMinutes: number;
}

export interface GenerationStats {
  newQuestions: number;
  pyqSolutions: number;
}
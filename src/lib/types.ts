export type View = 'dashboard' | 'capture' | 'vault' | 'recall' | 'tasks' | 'calendar' | 'flashcards' | 'settings' | 'timeline' | 'graph' | 'workspace' | 'analytics' | 'agent';

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Memory {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  tags: string[];
  domain: string;
  source_type: 'youtube' | 'web' | 'pdf' | 'note';
  source_url?: string;
  created_at: string;
  duplicate?: boolean;
  duplicate_of?: {
    id: string;
    title: string;
    domain?: string;
    source_type?: string;
    source_url?: string;
    created_at?: string;
  };
  // Rich analysis (optional — populated by capture agent)
  executive_summary?: string;
  action_items?: string[];
  glossary?: GlossaryTerm[];
  study_questions?: string[];
  notes?: string;
  // PDF-specific (optional)
  pdf_data?: string;        // data:application/pdf;base64,...
  pdf_pages?: number;
  pdf_size_kb?: number;
  pdf_word_count?: number;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface AgentMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'thinking' | 'steps' | 'welcome' | 'streaming';
  steps?: AgentStepData[];
  agents?: string[];
  workflow_id?: string;
  ts: string;
}

export interface AgentStepData {
  step_id: string;
  agent: string;
  tool: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  input?: any;
  output_summary?: string;
  error?: string;
  duration_ms?: number;
}

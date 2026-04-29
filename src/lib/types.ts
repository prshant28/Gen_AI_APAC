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
  // Inbox triage flags
  reviewed?: boolean;
  archived?: boolean;
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
  // Optional entity-level audit info, populated by the backend after a tool
  // returns. Used by the assistant's "done" chip to render concrete counts
  // like "checked 3 memories, created 1 task". May be absent for stats /
  // unknown tools, in which case the chip falls back to the agent path.
  entity_count?: number | null;
  entity_noun?: string;
  entity_verb?: string;
}

// ─── Workspace (project / folder / section / item / group) ────────────────────
export type WorkspaceSectionId = 'notes' | 'tasks' | 'ideas' | 'resources';

export interface WorkspaceSection {
  id: WorkspaceSectionId | string;
  name: string;
  icon?: string;
  description?: string;
}

export interface WorkspaceGroup {
  id: string;
  title: string;
  summary?: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  description?: string;
  weight?: number;
  sections?: WorkspaceSection[];
}

export interface WorkspaceItem {
  id: string;
  kind: string;
  ref_id?: string;
  title: string;
  url?: string;
  folder_id?: string;
  section_id?: WorkspaceSectionId | string;
  tags?: string[];
  group_id?: string;
  added_at?: string;
  meta?: {
    type?: 'video' | 'article';
    thumbnail?: string;
    youtube_id?: string;
    channel_title?: string;
    duration_display?: string;
    domain?: string;
    summary?: string;
    source_type?: string;
    tags?: string[];
  };
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description?: string;
  color: string;
  goal_type?: string;
  folders: WorkspaceFolder[];
  items: WorkspaceItem[];
  tasks: { id: string; text: string; folder_id?: string; done: boolean; created_at?: string; due_date?: string; calendar_event_id?: string }[];
  groups?: WorkspaceGroup[];
  default_sections?: WorkspaceSection[];
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceOrganizeAssignment {
  item_id: string;
  section_id: WorkspaceSectionId | string;
  tags: string[];
  group_id: string;
}

export interface WorkspaceOrganizeResult {
  ok: boolean;
  assignments: WorkspaceOrganizeAssignment[];
  groups: WorkspaceGroup[];
  stats?: { items: number; assigned: number; groups: number };
  error?: string;
}

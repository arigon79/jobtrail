// Shared enums + row types. Keep in sync with supabase/migrations/0001_init.sql.

export const JOB_STATUSES = [
  'to_apply', 'applied', 'oa', 'phone_screen', 'interview',
  'final', 'offer', 'accepted', 'rejected', 'withdrawn', 'ghosted',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  to_apply: 'To apply',
  applied: 'Applied',
  oa: 'Online assessment',
  phone_screen: 'Phone screen',
  interview: 'Interview',
  final: 'Final round',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
};

export const PRIORITIES = ['low', 'med', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const INTERVIEW_KINDS = ['phone', 'technical', 'behavioral', 'onsite', 'other'] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

export const INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'cancelled'] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const REFERRAL_STATUSES = [
  'to_ask', 'asked', 'agreed', 'referred', 'declined', 'no_response',
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'cyan'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const KANBAN_COLUMNS = ['todo', 'doing', 'done'] as const;
export type KanbanStatus = (typeof KANBAN_COLUMNS)[number];

export const KANBAN_COLUMN_LABELS: Record<KanbanStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
};

export const JOB_COLUMN_TYPES = ['text', 'number', 'date', 'select'] as const;
export type JobColumnType = (typeof JOB_COLUMN_TYPES)[number];

export const JOB_COLUMN_TYPE_LABELS: Record<JobColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
};

export const ATTACHMENT_KINDS = ['resume', 'cv', 'cover_letter', 'other'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  resume: 'Resume',
  cv: 'CV',
  cover_letter: 'Cover letter',
  other: 'Other',
};

export interface Company {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  notes: string | null;
  pinned: boolean;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  company_id: string | null;
  label: string;
  storage_path: string;
  is_default: boolean;
  uploaded_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  company_id: string | null;
  role: string;
  job_link: string | null;
  location: string | null;
  remote: boolean;
  salary_range: string | null;
  status: JobStatus;
  priority: Priority;
  posted_at: string | null;
  deadline: string | null;
  applied_at: string | null;
  follow_up_at: string | null;
  offer_amount: number | null;
  offer_currency: string | null;
  resume_id: string | null;
  notes: string | null;
  pinned: boolean;
  // User-defined columns: keyed by JobColumn.id → cell value (stored as text).
  custom: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// A user-defined Tracker column. `options` only used when type === 'select'.
export interface JobColumn {
  id: string;
  user_id: string;
  label: string;
  type: JobColumnType;
  options: string[];
  position: number;
  created_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  job_id: string;
  round: string | null;
  kind: InterviewKind | null;
  scheduled_at: string | null;
  outcome: InterviewOutcome | null;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  linkedin_url: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  user_id: string;
  contact_id: string;
  job_id: string | null;
  status: ReferralStatus;
  asked_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  user_id: string;
  job_id: string;
  kind: AttachmentKind;
  label: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  body: string;
  color: NoteColor;
  status: KanbanStatus;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

// --- Social layer (v2). Keep in sync with supabase/migrations/0005_social.sql. ---

export const FEED_VERBS = [
  'applied', 'interview', 'offer', 'accepted', 'rejected', 'open_to_work', 'custom',
] as const;
export type FeedVerb = (typeof FEED_VERBS)[number];

export const FEED_VERB_LABELS: Record<FeedVerb, string> = {
  applied: 'applied to',
  interview: 'landed an interview at',
  offer: 'got an offer from',
  accepted: 'accepted an offer from',
  rejected: 'was rejected by',
  open_to_work: 'is open to work',
  custom: '',
};

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'blocked'] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  current_company: string | null;
  open_to_work: boolean;
  share_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

export interface FeedEvent {
  id: string;
  actor_id: string;
  verb: FeedVerb;
  company_name: string | null;
  role: string | null;
  body: string | null;
  job_id: string | null;
  visibility: 'friends';
  created_at: string;
}

export interface Reaction {
  id: string;
  user_id: string;
  event_id: string;
  emoji: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  event_id: string;
  body: string;
  created_at: string;
}

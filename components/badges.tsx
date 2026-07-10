import {
  JOB_STATUS_LABELS,
  type JobStatus, type Priority, type ReferralStatus, type InterviewOutcome,
} from '@/lib/types';

type Color = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan';

const JOB_COLOR: Record<JobStatus, Color> = {
  to_apply: 'neutral', applied: 'blue', oa: 'cyan', phone_screen: 'cyan',
  interview: 'violet', final: 'violet', offer: 'green', accepted: 'green',
  rejected: 'red', withdrawn: 'neutral', ghosted: 'amber',
};

const PRIORITY_COLOR: Record<Priority, Color> = { low: 'neutral', med: 'blue', high: 'amber' };

const REFERRAL_COLOR: Record<ReferralStatus, Color> = {
  to_ask: 'neutral', asked: 'blue', agreed: 'cyan', referred: 'green',
  declined: 'red', no_response: 'amber',
};

const OUTCOME_COLOR: Record<InterviewOutcome, Color> = {
  pending: 'neutral', passed: 'green', failed: 'red', cancelled: 'amber',
};

function Badge({ color, children }: { color: Color; children: React.ReactNode }) {
  return (
    <span className={`badge ${color}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge color={JOB_COLOR[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge color={PRIORITY_COLOR[priority]}>{priority}</Badge>;
}

export function ReferralBadge({ status }: { status: ReferralStatus }) {
  return <Badge color={REFERRAL_COLOR[status]}>{status.replace('_', ' ')}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: InterviewOutcome | null }) {
  const o = outcome ?? 'pending';
  return <Badge color={OUTCOME_COLOR[o]}>{o}</Badge>;
}

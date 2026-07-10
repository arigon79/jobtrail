import { JOB_STATUS_LABELS, type JobStatus } from '@/lib/types';

// The happy-path pipeline, in order. Terminal-negative statuses sit outside it.
const PIPELINE: JobStatus[] = [
  'to_apply', 'applied', 'oa', 'phone_screen', 'interview', 'final', 'offer', 'accepted',
];
const NEGATIVE: Partial<Record<JobStatus, string>> = {
  rejected: 'Rejected', withdrawn: 'Withdrawn', ghosted: 'Ghosted',
};

export function JobProgress({ status }: { status: JobStatus }) {
  const negativeLabel = NEGATIVE[status];
  const current = PIPELINE.indexOf(status);

  return (
    <div className="progress" role="img" aria-label={`Stage: ${JOB_STATUS_LABELS[status]}`}>
      <div className="progress-track">
        {PIPELINE.map((s, i) => {
          const state = negativeLabel
            ? 'todo'
            : i < current
              ? 'done'
              : i === current
                ? 'active'
                : 'todo';
          return (
            <div key={s} className={`progress-step ${state}`}>
              <span className="progress-dot" aria-hidden="true" />
              <span className="progress-label">{JOB_STATUS_LABELS[s]}</span>
            </div>
          );
        })}
      </div>
      {negativeLabel && <span className="progress-negative">✕ {negativeLabel}</span>}
    </div>
  );
}

/**
 * Pin/unpin toggle rendered as a small form so it works without client JS.
 * `action` is a server action; `pinned` is the current state.
 */
export function PinButton({
  action,
  id,
  pinned,
  label,
}: {
  action: (formData: FormData) => void;
  id: string;
  pinned: boolean;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="pinned" value={String(pinned)} />
      <button
        type="submit"
        className={`pin-btn${pinned ? ' on' : ''}`}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
        title={pinned ? 'Unpin' : 'Pin'}
      >
        <svg viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 17v5" />
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
        </svg>
      </button>
    </form>
  );
}

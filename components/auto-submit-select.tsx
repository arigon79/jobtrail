'use client';

/**
 * A spreadsheet-style inline editor: pick a value and it saves immediately
 * (submits its enclosing form via the given server action) — no Save button.
 * Falls back to a normal select if JS is disabled, but then needs submission.
 */
export function AutoSubmitSelect({
  action,
  id,
  name,
  defaultValue,
  ariaLabel,
  children,
}: {
  action: (formData: FormData) => void;
  id: string;
  name: string;
  defaultValue: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {children}
      </select>
    </form>
  );
}

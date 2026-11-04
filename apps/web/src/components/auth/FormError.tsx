/** An error that belongs to the whole form (wrong password, network…), shown above the fields and announced. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-ink bg-surface rounded-card flex items-start gap-3 border-2 px-4 py-3 text-sm font-bold"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="text-sticker-ember mt-0.5 size-5 shrink-0">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p>{message}</p>
    </div>
  );
}

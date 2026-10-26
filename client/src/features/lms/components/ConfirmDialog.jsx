import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open = false,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;

    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault();
        onCancel?.();
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusableElements = dialog.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );

      const elements = Array.from(focusableElements);

      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  const confirmStyles = {
    danger:
      'border border-[#B86D78]/50 bg-[#B86D78] text-[#14161C] hover:bg-[#D58B95]',
    primary:
      'border border-[#CDB5F7] bg-[#CDB5F7] text-[#14161C] hover:bg-[#DCCBFA]',
    secondary:
      'border border-[#E5DF98]/50 bg-[#E5DF98] text-[#14161C] hover:bg-[#EEE9B4]',
  };

  const selectedConfirmStyle =
    confirmStyles[variant] || confirmStyles.danger;

  async function handleConfirm() {
    if (loading || !onConfirm) {
      return;
    }

    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#08090D]/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel?.();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lms-confirm-dialog-title"
        aria-describedby="lms-confirm-dialog-description"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-[#3B3C43] bg-[#1D1F27] p-5 shadow-2xl shadow-black/30 sm:p-6"
      >
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5DF98]/25 bg-[#E5DF98]/10 text-[#E5DF98]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M10.3 3.9 2.9 17a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            />
          </svg>
        </div>

        <h2
          id="lms-confirm-dialog-title"
          className="text-lg font-bold tracking-tight text-[#EAEAE6] sm:text-xl"
        >
          {title}
        </h2>

        <p
          id="lms-confirm-dialog-description"
          className="mt-2 text-sm leading-6 text-[#A5A6B0]"
        >
          {description}
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27] disabled:cursor-not-allowed disabled:opacity-50 ${selectedConfirmStyle}`}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
              />
            )}

            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
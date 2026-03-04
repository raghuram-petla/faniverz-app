import { useEffect, useRef } from 'react';

/**
 * Warns users before navigating away when there are unsaved changes.
 * Handles: browser reload/close, Next.js Link clicks, and browser back/forward.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    // Browser reload / close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };

    // Intercept <a> clicks (Next.js Link components) in capture phase
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;

      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Browser back / forward
    const handlePopState = () => {
      if (isDirtyRef.current) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?',
        );
        if (!confirmed) {
          history.pushState(null, '', window.location.href);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}

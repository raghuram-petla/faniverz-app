import { useEffect, useRef } from 'react';

/**
 * Warns users before navigating away when there are unsaved changes.
 * Handles: browser reload/close, Next.js Link clicks, and browser back/forward.
 *
 * @edge: Next.js App Router client-side navigation via router.push() is NOT intercepted.
 * Only <Link> clicks (which render as <a> tags) are caught by the click handler.
 * Programmatic navigation from hooks or callbacks bypasses this warning entirely.
 * @sideeffect: pushes a guard entry to browser history only when isDirty becomes true,
 * and pops it when isDirty becomes false, so there is no stale guard entry.
 */
const DEFAULT_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?';

export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const messageRef = useRef(message ?? DEFAULT_MESSAGE);
  messageRef.current = message ?? DEFAULT_MESSAGE;
  // @invariant: tracks whether a guard history entry is currently pushed
  const hasGuardRef = useRef(false);
  // @invariant: when true, the next popstate event is from our own cleanup — ignore it
  const suppressPopRef = useRef(false);

  useEffect(() => {
    // Browser reload / close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };

    // @assumes: Next.js Link components render as <a> tags in the DOM. If Next.js
    // changes Link to use a different element (e.g. div with onClick), this
    // closest('a') check would stop intercepting client-side navigation.
    // Uses capture phase (3rd arg = true) so it runs before Next.js's click handler.
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;

      const confirmed = window.confirm(messageRef.current);
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handlePopState = () => {
      // Ignore popstate triggered by our own guard cleanup
      /* v8 ignore start */
      if (suppressPopRef.current) {
        suppressPopRef.current = false;
        return;
      }
      /* v8 ignore stop */

      if (isDirtyRef.current && hasGuardRef.current) {
        hasGuardRef.current = false;
        const confirmed = window.confirm(messageRef.current);
        if (!confirmed) {
          // Re-push the guard to stay on the page
          history.pushState(null, '', location.href);
          hasGuardRef.current = true;
          return;
        }
      }

      // Actually navigate back
      suppressPopRef.current = true;
      history.back();
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

  // @sideeffect: push/pop guard entry as isDirty changes
  useEffect(() => {
    if (isDirty && !hasGuardRef.current) {
      // Push guard entry when form becomes dirty
      history.pushState(null, '', location.href);
      hasGuardRef.current = true;
    } else if (!isDirty && hasGuardRef.current) {
      // Pop the guard entry when form becomes clean (e.g. after save)
      hasGuardRef.current = false;
      suppressPopRef.current = true;
      history.back();
    }
  }, [isDirty]);
}

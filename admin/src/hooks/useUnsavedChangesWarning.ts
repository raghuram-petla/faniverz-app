import { useEffect, useRef } from 'react';

/**
 * Warns users before navigating away when there are unsaved changes.
 * Handles: browser reload/close, Next.js Link clicks, and browser back/forward.
 *
 * @edge: Next.js App Router client-side navigation via router.push() is NOT intercepted.
 * Only <Link> clicks (which render as <a> tags) are caught by the click handler.
 * Programmatic navigation from hooks or callbacks bypasses this warning entirely.
 * @sideeffect: pushes a guard entry to browser history on mount. If the component
 * unmounts without the user navigating back (e.g. programmatic redirect), the guard
 * entry stays in history, causing an extra "back" press to return to the same page.
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

      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Browser back / forward — push a guard entry with the same URL so pressing
    // back pops the guard instead of actually navigating away.
    let intentionalNav = false;
    history.pushState(null, '', location.href);

    const handlePopState = () => {
      if (intentionalNav) return;

      if (isDirtyRef.current) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?',
        );
        if (!confirmed) {
          // Re-push the guard to stay on the page
          history.pushState(null, '', location.href);
          return;
        }
      }

      // Actually navigate back (past the guard entry)
      intentionalNav = true;
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
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

// ── Mocks ────────────────────────────────────────────────────────────────────

const pushStateSpy = vi.spyOn(history, 'pushState').mockImplementation(() => {});
const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

afterEach(() => {
  confirmSpy.mockClear();
  pushStateSpy.mockClear();
  backSpy.mockClear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useUnsavedChangesWarning', () => {
  it('pushes guard history entry when isDirty is true', () => {
    renderHook(() => useUnsavedChangesWarning(true));
    expect(pushStateSpy).toHaveBeenCalled();
  });

  it('does not push guard when not dirty', () => {
    renderHook(() => useUnsavedChangesWarning(false));
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('pops guard history entry when isDirty becomes false', () => {
    const { rerender } = renderHook(({ isDirty }) => useUnsavedChangesWarning(isDirty), {
      initialProps: { isDirty: true },
    });

    backSpy.mockClear();
    rerender({ isDirty: false });
    expect(backSpy).toHaveBeenCalled();
  });

  describe('beforeunload', () => {
    it('prevents default when dirty', () => {
      renderHook(() => useUnsavedChangesWarning(true));

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not prevent default when not dirty', () => {
      renderHook(() => useUnsavedChangesWarning(false));

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('click handler', () => {
    it('shows confirm dialog for internal link clicks when dirty', () => {
      renderHook(() => useUnsavedChangesWarning(true));

      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/movies/123');
      document.body.appendChild(anchor);

      anchor.click();
      expect(confirmSpy).toHaveBeenCalled();

      document.body.removeChild(anchor);
    });

    it('does not show confirm for external links', () => {
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();

      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://external.com');
      document.body.appendChild(anchor);

      anchor.click();
      expect(confirmSpy).not.toHaveBeenCalled();

      document.body.removeChild(anchor);
    });

    it('does not show confirm for mailto links', () => {
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();

      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'mailto:test@test.com');
      document.body.appendChild(anchor);

      anchor.click();
      expect(confirmSpy).not.toHaveBeenCalled();

      document.body.removeChild(anchor);
    });

    it('does not show confirm when not dirty', () => {
      renderHook(() => useUnsavedChangesWarning(false));

      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      document.body.appendChild(anchor);

      anchor.click();
      expect(confirmSpy).not.toHaveBeenCalled();

      document.body.removeChild(anchor);
    });

    it('prevents navigation when user cancels confirm', () => {
      confirmSpy.mockReturnValueOnce(false);
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();
      confirmSpy.mockReturnValueOnce(false);

      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/movies');
      document.body.appendChild(anchor);

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropSpy = vi.spyOn(clickEvent, 'stopPropagation');
      anchor.dispatchEvent(clickEvent);

      expect(confirmSpy).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropSpy).toHaveBeenCalled();

      document.body.removeChild(anchor);
    });

    it('does not intercept clicks on non-anchor elements', () => {
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();

      const div = document.createElement('div');
      document.body.appendChild(div);

      div.click();
      expect(confirmSpy).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });

  describe('popstate handler', () => {
    it('shows confirm on popstate when dirty and guard is active', () => {
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();

      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('re-pushes guard when user cancels back navigation', () => {
      renderHook(() => useUnsavedChangesWarning(true));
      confirmSpy.mockClear();
      pushStateSpy.mockClear();
      confirmSpy.mockReturnValueOnce(false);

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(confirmSpy).toHaveBeenCalled();
      expect(pushStateSpy).toHaveBeenCalled();
    });
  });

  it('uses custom message when provided', () => {
    const customMsg = 'Custom warning!';
    renderHook(() => useUnsavedChangesWarning(true, customMsg));
    confirmSpy.mockClear();

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/test');
    document.body.appendChild(anchor);

    anchor.click();
    expect(confirmSpy).toHaveBeenCalledWith(customMsg);

    document.body.removeChild(anchor);
  });

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));
    confirmSpy.mockClear();

    unmount();

    // After unmount, clicking an internal link should not show confirm
    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/test');
    document.body.appendChild(anchor);

    anchor.click();
    expect(confirmSpy).not.toHaveBeenCalled();

    document.body.removeChild(anchor);
  });
});

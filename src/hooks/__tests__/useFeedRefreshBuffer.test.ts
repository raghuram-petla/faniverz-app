import { renderHook } from '@testing-library/react-native';
import { useFeedRefreshBuffer } from '../useFeedRefreshBuffer';

const makeItems = (ids: string[]) => ids.map((id) => ({ id }));

describe('useFeedRefreshBuffer', () => {
  it('returns items directly when not refreshing', () => {
    const items = makeItems(['1', '2', '3']);
    const { result } = renderHook(() => useFeedRefreshBuffer(items, false));
    expect(result.current.displayItems).toBe(items);
    expect(result.current.noNewData).toBe(false);
  });

  it('freezes items while refreshing', () => {
    const original = makeItems(['1', '2']);
    let items = original;
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));
    expect(result.current.displayItems).toBe(original);

    // Start refresh — items should freeze
    refreshing = true;
    rerender({});
    items = makeItems(['3', '1', '2']);
    rerender({});
    expect(result.current.displayItems).toBe(original);
  });

  it('unfreezes items when refresh ends', () => {
    const original = makeItems(['1', '2']);
    const updated = makeItems(['3', '1', '2']);
    let items = original;
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));

    // Start refresh
    refreshing = true;
    rerender({});
    // End refresh with new data
    items = updated;
    refreshing = false;
    rerender({});
    expect(result.current.displayItems).toBe(updated);
    expect(result.current.noNewData).toBe(false);
  });

  it('sets noNewData when items unchanged after refresh', () => {
    const items = makeItems(['1', '2', '3']);
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));

    // Start refresh
    refreshing = true;
    rerender({});
    // End refresh with same items
    refreshing = false;
    rerender({});
    expect(result.current.noNewData).toBe(true);
  });

  it('resets noNewData on next render', () => {
    const items = makeItems(['1', '2']);
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));

    // Complete a refresh with no new data
    refreshing = true;
    rerender({});
    refreshing = false;
    rerender({});
    expect(result.current.noNewData).toBe(true);

    // Next render resets noNewData
    rerender({});
    expect(result.current.noNewData).toBe(false);
  });

  it('handles more than 10 items by comparing only top 10', () => {
    const ids = Array.from({ length: 15 }, (_, i) => String(i));
    let items = makeItems(ids);
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));

    refreshing = true;
    rerender({});
    // Change item at index 12 (outside top 10) — should still be "no new data"
    items = [...items.slice(0, 12), { id: 'new' }, ...items.slice(13)];
    refreshing = false;
    rerender({});
    expect(result.current.noNewData).toBe(true);
  });

  it('detects new data when top 10 changes', () => {
    let items = makeItems(['1', '2', '3']);
    let refreshing = false;
    const { result, rerender } = renderHook(() => useFeedRefreshBuffer(items, refreshing));

    refreshing = true;
    rerender({});
    items = makeItems(['new', '1', '2', '3']);
    refreshing = false;
    rerender({});
    expect(result.current.noNewData).toBe(false);
  });
});

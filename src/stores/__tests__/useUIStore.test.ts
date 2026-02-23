import { useUIStore } from '../useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ showSearchOverlay: false });
  });

  it('toggleSearchOverlay flips state', () => {
    expect(useUIStore.getState().showSearchOverlay).toBe(false);
    useUIStore.getState().toggleSearchOverlay();
    expect(useUIStore.getState().showSearchOverlay).toBe(true);
    useUIStore.getState().toggleSearchOverlay();
    expect(useUIStore.getState().showSearchOverlay).toBe(false);
  });
});

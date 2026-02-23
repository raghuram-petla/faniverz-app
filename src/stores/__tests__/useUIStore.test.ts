import { useUIStore } from '../useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ showSearchOverlay: false, onboardingComplete: false });
  });

  it('toggleSearchOverlay flips state', () => {
    expect(useUIStore.getState().showSearchOverlay).toBe(false);
    useUIStore.getState().toggleSearchOverlay();
    expect(useUIStore.getState().showSearchOverlay).toBe(true);
    useUIStore.getState().toggleSearchOverlay();
    expect(useUIStore.getState().showSearchOverlay).toBe(false);
  });

  it('setOnboardingComplete updates state', () => {
    useUIStore.getState().setOnboardingComplete(true);
    expect(useUIStore.getState().onboardingComplete).toBe(true);
  });
});

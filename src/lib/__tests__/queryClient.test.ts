import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    onlineManager: {
      setEventListener: jest.fn(),
    },
  };
});

describe('Query Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures onlineManager with NetInfo', () => {
    jest.isolateModules(() => require('../queryClient'));

    expect(onlineManager.setEventListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('has correct default staleTime (5 min)', () => {
    let qc: { getDefaultOptions: () => { queries?: { staleTime?: number } } };
    jest.isolateModules(() => {
      qc = require('../queryClient').queryClient;
    });

    expect(qc!.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('has correct default gcTime (30 min)', () => {
    let qc: { getDefaultOptions: () => { queries?: { gcTime?: number } } };
    jest.isolateModules(() => {
      qc = require('../queryClient').queryClient;
    });

    expect(qc!.getDefaultOptions().queries?.gcTime).toBe(30 * 60 * 1000);
  });

  it('has retry set to 2', () => {
    let qc: { getDefaultOptions: () => { queries?: { retry?: number } } };
    jest.isolateModules(() => {
      qc = require('../queryClient').queryClient;
    });

    expect(qc!.getDefaultOptions().queries?.retry).toBe(2);
  });

  it('has refetchOnWindowFocus disabled', () => {
    let qc: { getDefaultOptions: () => { queries?: { refetchOnWindowFocus?: boolean } } };
    jest.isolateModules(() => {
      qc = require('../queryClient').queryClient;
    });

    expect(qc!.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('NetInfo listener is wired to onlineManager', () => {
    jest.isolateModules(() => require('../queryClient'));

    const setEventListenerCall = (onlineManager.setEventListener as jest.Mock).mock.calls[0];
    const listenerFn = setEventListenerCall[0];

    const mockSetOnline = jest.fn();
    listenerFn(mockSetOnline);

    expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
  });
});

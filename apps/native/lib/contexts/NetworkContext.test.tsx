import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NetworkProvider, useNetwork } from './NetworkContext';

let listener: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | null =
  null;
const mockFetch = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: any) => {
      listener = cb;
      return jest.fn(); // unsubscribe
    }),
    fetch: (...args: unknown[]) => mockFetch(...args),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <NetworkProvider>{children}</NetworkProvider>;
}

describe('useNetwork', () => {
  beforeEach(() => {
    listener = null;
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it('defaults to connected/reachable outside a provider (context default value)', async () => {
    const { result } = await renderHook(() => useNetwork());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('applies the initial NetInfo.fetch() result once resolved', async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const { result } = await renderHook(() => useNetwork(), { wrapper });

    await waitFor(() => expect(result.current.isConnected).toBe(false));
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('propagates NetInfo listener updates', async () => {
    const { result } = await renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(listener).not.toBeNull());

    await act(async () => {
      listener!({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('refresh() re-fetches connectivity state', async () => {
    const { result } = await renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isConnected).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2); // initial mount fetch + refresh
  });
});

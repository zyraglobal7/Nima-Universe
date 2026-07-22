import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './ThemeContext';

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ setColorScheme: jest.fn() }),
}));

const mockUseRNColorScheme = jest.fn(() => 'light');
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockUseRNColorScheme(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useTheme', () => {
  it('throws when used outside a ThemeProvider', async () => {
    // renderHook without a wrapper: the hook body throws synchronously inside
    // React's render, which React re-throws to the caller.
    await expect(renderHook(() => useTheme())).rejects.toThrow(
      'useTheme must be used within a ThemeProvider',
    );
  });

  it('defaults to the light theme preference', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
    expect(result.current.colorScheme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('setTheme("dark") flips isDark/colorScheme regardless of system scheme', async () => {
    mockUseRNColorScheme.mockReturnValue('light');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.colorScheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('setTheme("system") resolves against the OS color scheme', async () => {
    mockUseRNColorScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.colorScheme).toBe('dark');
  });
});

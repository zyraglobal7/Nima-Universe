import { renderHook } from '@testing-library/react-native';

const mockUseWindowDimensions = jest.fn();
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

import { useResponsiveLayout } from './useResponsiveLayout';

describe('useResponsiveLayout', () => {
  it('treats phone-width screens as non-tablet with the default phone column count', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
    const { result } = await renderHook(() => useResponsiveLayout());
    expect(result.current.isTablet).toBe(false);
    expect(result.current.columns).toBe(2);
    expect(result.current.horizontalPadding).toBe(16);
  });

  it('treats widths at or above the tablet breakpoint (700) as tablet', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 744, height: 1133 });
    const { result } = await renderHook(() => useResponsiveLayout());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.columns).toBe(3);
    expect(result.current.horizontalPadding).toBe(24);
  });

  it('bumps to an extra column on very wide (>=1000) screens', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 1024, height: 1366 });
    const { result } = await renderHook(() => useResponsiveLayout());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.columns).toBe(4);
  });

  it('respects custom phone/tablet column counts', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
    const { result } = await renderHook(() => useResponsiveLayout(1, 5));
    expect(result.current.columns).toBe(1);
  });
});

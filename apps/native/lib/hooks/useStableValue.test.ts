import { renderHook } from '@testing-library/react-native';
import { useStableValue } from './useStableValue';

describe('useStableValue', () => {
  it('returns the fallback before any defined value has arrived', async () => {
    const { result } = await renderHook(() => useStableValue<number>(undefined, -1));
    expect(result.current).toBe(-1);
  });

  it('adopts the first defined value', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: number | undefined }) => useStableValue(value, -1),
      { initialProps: { value: undefined } },
    );
    expect(result.current).toBe(-1);

    await rerender({ value: 42 });
    expect(result.current).toBe(42);
  });

  it('retains the last defined value when the query transitions back to undefined', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: number | undefined }) => useStableValue(value, -1),
      { initialProps: { value: 5 } },
    );
    expect(result.current).toBe(5);

    // Simulates a Convex query resubscription flicker back to `undefined`.
    await rerender({ value: undefined });
    expect(result.current).toBe(5);
  });
});

import { renderHook, act } from '@testing-library/react-native';

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();

jest.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

jest.mock('@/convex/_generated/api', () => ({
  api: {
    credits: {
      queries: {
        getUserCredits: 'credits.queries.getUserCredits',
        getCreditPackages: 'credits.queries.getCreditPackages',
        getPurchaseHistory: 'credits.queries.getPurchaseHistory',
        getPurchaseStatus: 'credits.queries.getPurchaseStatus',
      },
      mutations: {
        initiatePurchase: 'credits.mutations.initiatePurchase',
      },
    },
  },
}));

import { useCredits } from './useCredits';

function mockQueries({
  credits,
  packages = [],
  history = [],
  purchaseStatus,
}: {
  credits?: { freeRemaining: number; purchased: number; total: number; freePerWeek: number };
  packages?: unknown[];
  history?: unknown[];
  purchaseStatus?: { status: string; failureReason?: string };
}) {
  mockUseQuery.mockImplementation((endpoint: string) => {
    if (endpoint === 'credits.queries.getUserCredits') return credits;
    if (endpoint === 'credits.queries.getCreditPackages') return packages;
    if (endpoint === 'credits.queries.getPurchaseHistory') return history;
    if (endpoint === 'credits.queries.getPurchaseStatus') return purchaseStatus;
    return undefined;
  });
}

describe('useCredits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(jest.fn());
  });

  it('reports isLoading while the credits query is still undefined', async () => {
    mockQueries({ credits: undefined });
    const { result } = await renderHook(() => useCredits());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.total).toBe(0);
  });

  it.each([
    [0, false, true],
    [1, true, true],
    [2, true, true],
    [3, true, false],
    [10, true, false],
  ])('total=%i -> hasCredits=%s, isLow=%s', async (total, hasCredits, isLow) => {
    mockQueries({
      credits: { freeRemaining: 0, purchased: total, total, freePerWeek: 5 },
    });
    const { result } = await renderHook(() => useCredits());
    expect(result.current.hasCredits).toBe(hasCredits);
    expect(result.current.isLow).toBe(isLow);
  });

  it('buyCredits: success path sets activePurchaseId and returns success', async () => {
    mockQueries({ credits: { freeRemaining: 5, purchased: 0, total: 5, freePerWeek: 5 } });
    const initiatePurchase = jest.fn().mockResolvedValue({
      success: true,
      purchaseId: 'purchase-1',
    });
    mockUseMutation.mockReturnValue(initiatePurchase);

    const { result } = await renderHook(() => useCredits());

    let outcome: any;
    await act(async () => {
      outcome = await result.current.buyCredits('pkg-1', '0700000000');
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.activePurchaseId).toBe('purchase-1');
    expect(result.current.isPurchasing).toBe(false);
  });

  it('buyCredits: server-rejected purchase surfaces the error and does not set activePurchaseId', async () => {
    mockQueries({ credits: { freeRemaining: 0, purchased: 0, total: 0, freePerWeek: 5 } });
    const initiatePurchase = jest.fn().mockResolvedValue({
      success: false,
      error: 'Insufficient M-Pesa balance',
    });
    mockUseMutation.mockReturnValue(initiatePurchase);

    const { result } = await renderHook(() => useCredits());

    let outcome: any;
    await act(async () => {
      outcome = await result.current.buyCredits('pkg-1', '0700000000');
    });

    expect(outcome).toEqual({ success: false, error: 'Insufficient M-Pesa balance' });
    expect(result.current.activePurchaseId).toBeNull();
    expect(result.current.purchaseError).toBe('Insufficient M-Pesa balance');
    expect(result.current.isPurchasing).toBe(false);
  });

  it('buyCredits: thrown mutation error is caught and surfaced as purchaseError', async () => {
    mockQueries({ credits: { freeRemaining: 0, purchased: 0, total: 0, freePerWeek: 5 } });
    const initiatePurchase = jest.fn().mockRejectedValue(new Error('network down'));
    mockUseMutation.mockReturnValue(initiatePurchase);

    const { result } = await renderHook(() => useCredits());

    let outcome: any;
    await act(async () => {
      outcome = await result.current.buyCredits('pkg-1', '0700000000');
    });

    expect(outcome).toEqual({ success: false, error: 'network down' });
    expect(result.current.purchaseError).toBe('network down');
    expect(result.current.isPurchasing).toBe(false);
  });

  it('resetPurchase clears activePurchaseId, isPurchasing and purchaseError', async () => {
    mockQueries({ credits: { freeRemaining: 0, purchased: 0, total: 0, freePerWeek: 5 } });
    const initiatePurchase = jest.fn().mockResolvedValue({ success: true, purchaseId: 'p1' });
    mockUseMutation.mockReturnValue(initiatePurchase);

    const { result } = await renderHook(() => useCredits());
    await act(async () => {
      await result.current.buyCredits('pkg-1', '0700000000');
    });
    expect(result.current.activePurchaseId).toBe('p1');

    await act(async () => {
      result.current.resetPurchase();
    });

    expect(result.current.activePurchaseId).toBeNull();
    expect(result.current.isPurchasing).toBe(false);
    expect(result.current.purchaseError).toBeNull();
  });
});

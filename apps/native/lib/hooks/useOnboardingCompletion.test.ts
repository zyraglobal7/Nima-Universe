import { renderHook, waitFor } from '@testing-library/react-native';

const mockUseQuery = jest.fn();
const mockMarkOnboardingComplete = jest.fn().mockResolvedValue(undefined);
const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockGetOrCreateUser = jest.fn();
const mockClaimOnboardingImages = jest.fn().mockResolvedValue({ claimedCount: 0 });

jest.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (endpoint: string) => {
    if (endpoint === 'users.mutations.markOnboardingComplete') return mockMarkOnboardingComplete;
    if (endpoint === 'users.mutations.completeOnboarding') return mockCompleteOnboarding;
    if (endpoint === 'users.mutations.getOrCreateUser') return mockGetOrCreateUser;
    if (endpoint === 'userImages.mutations.claimOnboardingImages') return mockClaimOnboardingImages;
    return jest.fn();
  },
}));

jest.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      queries: {
        getCurrentUser: 'users.queries.getCurrentUser',
        getOnboardingState: 'users.queries.getOnboardingState',
      },
      mutations: {
        getOrCreateUser: 'users.mutations.getOrCreateUser',
        completeOnboarding: 'users.mutations.completeOnboarding',
        markOnboardingComplete: 'users.mutations.markOnboardingComplete',
      },
    },
    userImages: {
      mutations: {
        claimOnboardingImages: 'userImages.mutations.claimOnboardingImages',
      },
    },
  },
}));

jest.mock('@/lib/auth-storage', () => ({
  getUserInfo: jest.fn().mockResolvedValue(null),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useOnboardingCompletion, hasPendingOnboardingData } from './useOnboardingCompletion';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'nima-onboarding-data';

function mockQueries(user: unknown, onboardingState: unknown) {
  mockUseQuery.mockImplementation((endpoint: string) => {
    if (endpoint === 'users.queries.getCurrentUser') return user;
    if (endpoint === 'users.queries.getOnboardingState') return onboardingState;
    return undefined;
  });
}

const completeStoredData = {
  gender: 'male' as const,
  age: '25',
  stylePreferences: ['casual'],
  shirtSize: 'M',
  waistSize: '32',
  height: '180',
  heightUnit: 'cm' as const,
  shoeSize: '42',
  shoeSizeUnit: 'EU' as const,
  country: 'KE',
  currency: 'KES',
  budgetRange: 'mid' as const,
};

describe('useOnboardingCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkOnboardingComplete.mockResolvedValue(undefined);
    mockCompleteOnboarding.mockResolvedValue(undefined);
    mockClaimOnboardingImages.mockResolvedValue({ claimedCount: 0 });
    return AsyncStorage.clear();
  });

  it('needsOnboarding is false while queries are still loading', async () => {
    mockQueries(undefined, undefined);
    const { result } = await renderHook(() => useOnboardingCompletion());
    expect(result.current.needsOnboarding).toBe(false);
  });

  it('needsOnboarding is true for an authenticated user missing profile data and images', async () => {
    mockQueries(
      { onboardingCompleted: false },
      {
        isAuthenticated: true,
        hasUser: true,
        onboardingCompleted: false,
        hasProfileData: false,
        hasImages: false,
      },
    );
    const { result } = await renderHook(() => useOnboardingCompletion());
    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

  it('marks onboarding complete server-side when profile+images exist but the flag is stale', async () => {
    mockQueries(
      { onboardingCompleted: false },
      { isAuthenticated: true, hasUser: true, onboardingCompleted: false, hasProfileData: true, hasImages: true },
    );

    const { result } = await renderHook(() => useOnboardingCompletion());

    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(mockMarkOnboardingComplete).toHaveBeenCalledWith({});
  });

  it('does not call markOnboardingComplete when already marked complete', async () => {
    mockQueries(
      { onboardingCompleted: true },
      { isAuthenticated: true, hasUser: true, onboardingCompleted: true, hasProfileData: true, hasImages: true },
    );

    const { result } = await renderHook(() => useOnboardingCompletion());

    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(mockMarkOnboardingComplete).not.toHaveBeenCalled();
  });

  it('short-circuits to completed when stored onboarding data is missing a required field', async () => {
    const { gender, ...incomplete } = completeStoredData;
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...incomplete, savedAt: Date.now() }),
    );

    mockQueries(
      { onboardingCompleted: false },
      { isAuthenticated: true, hasUser: true, onboardingCompleted: false, hasProfileData: false, hasImages: false },
    );

    const { result } = await renderHook(() => useOnboardingCompletion());

    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });

  it('completes onboarding using valid stored data', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...completeStoredData, savedAt: Date.now() }),
    );

    mockQueries(
      { onboardingCompleted: false },
      { isAuthenticated: true, hasUser: true, onboardingCompleted: false, hasProfileData: false, hasImages: false },
    );

    const { result } = await renderHook(() => useOnboardingCompletion());

    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'male', age: '25' }),
    );
  });
});

describe('hasPendingOnboardingData / clearStoredOnboardingData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns false when nothing is stored', async () => {
    expect(await hasPendingOnboardingData()).toBe(false);
  });

  it('returns true for fresh stored data and false once expired (>24h)', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...completeStoredData, savedAt: Date.now() }),
    );
    expect(await hasPendingOnboardingData()).toBe(true);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...completeStoredData, savedAt: Date.now() - 25 * 60 * 60 * 1000 }),
    );
    expect(await hasPendingOnboardingData()).toBe(false);
  });
});

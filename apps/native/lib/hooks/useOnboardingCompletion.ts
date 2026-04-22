import { useEffect, useState, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/convex/_generated/api';
import { getUserInfo, type StoredUserInfo } from '@/lib/auth-storage';

// AsyncStorage keys (replaces localStorage from web)
const ONBOARDING_STORAGE_KEY = 'nima-onboarding-data';
const ONBOARDING_TOKEN_KEY = 'nima-onboarding-token';

// 24 hour expiration
const STORAGE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

interface StoredOnboardingData {
  gender: 'male' | 'female' | 'prefer-not-to-say';
  age: string;
  stylePreferences: string[];
  shirtSize: string;
  waistSize: string;
  height: string;
  heightUnit: 'cm' | 'ft';
  shoeSize: string;
  shoeSizeUnit: 'EU' | 'US' | 'UK';
  country: string;
  currency: string;
  budgetRange: 'low' | 'mid' | 'premium';
  email?: string;
  onboardingToken?: string;
  uploadedImageIds?: string[];
  savedAt: number;
}

// ---------- Storage helpers (AsyncStorage replaces localStorage) ----------

async function getStoredOnboardingData(): Promise<StoredOnboardingData | null> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredOnboardingData;

    // Check if data is too old
    if (Date.now() - data.savedAt > STORAGE_EXPIRATION_MS) {
      await AsyncStorage.multiRemove([ONBOARDING_STORAGE_KEY, ONBOARDING_TOKEN_KEY]);
      return null;
    }

    return data;
  } catch {
    await AsyncStorage.multiRemove([ONBOARDING_STORAGE_KEY, ONBOARDING_TOKEN_KEY]);
    return null;
  }
}

export async function saveOnboardingData(data: Omit<StoredOnboardingData, 'savedAt'>): Promise<void> {
  await AsyncStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({ ...data, savedAt: Date.now() })
  );
}

async function clearStoredOnboardingData(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_STORAGE_KEY, ONBOARDING_TOKEN_KEY]);
}

// ---------- Retry helper ----------

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 500
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ---------- Main hook ----------

/**
 * Hook to handle onboarding completion after authentication.
 *
 * Port of the web's useOnboardingCompletion hook.
 * Key differences:
 * - Uses AsyncStorage instead of localStorage
 * - Reads WorkOS user info from SecureStore instead of useAuth()
 * - All storage operations are async
 */
export function useOnboardingCompletion() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const processingRef = useRef(false);

  // Get current user from Convex
  const user = useQuery(api.users.queries.getCurrentUser);

  // Get onboarding state (profile data + images check)
  const onboardingState = useQuery(api.users.queries.getOnboardingState);

  // Mutations
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const markOnboardingComplete = useMutation(api.users.mutations.markOnboardingComplete);
  const claimOnboardingImages = useMutation(api.userImages.mutations.claimOnboardingImages);

  const processOnboarding = useCallback(async () => {
    // Prevent double processing
    if (processingRef.current) return;

    // Wait for queries to resolve
    if (user === undefined || onboardingState === undefined) return;

    let currentUser = user;

    if (user === null) {
      try {
        // Read WorkOS user info from SecureStore (replaces useAuth())
        const workosUser = await getUserInfo();
        const profileData = workosUser
          ? {
              email: workosUser.email || undefined,
              emailVerified: workosUser.emailVerified || false,
              firstName: workosUser.firstName || undefined,
              lastName: workosUser.lastName || undefined,
              profileImageUrl: workosUser.profilePictureUrl || undefined,
            }
          : {};

        const createdUser = await getOrCreateUser(profileData);
        if (!createdUser) {
          setCompleted(true);
          return;
        }
        currentUser = createdUser;
      } catch (err) {
        console.error('[ONBOARDING] Failed to get or create user:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate');
        setCompleted(true);
        return;
      }
    }

    if (!currentUser) {
      setCompleted(true);
      return;
    }

    // SMART COMPLETION CHECK
    if (onboardingState?.hasProfileData && onboardingState?.hasImages) {
      if (!currentUser.onboardingCompleted) {
        try {
          await markOnboardingComplete({});
        } catch (err) {
          console.error('[ONBOARDING] Failed to mark complete:', err);
        }
      }
      await clearStoredOnboardingData();
      setCompleted(true);
      return;
    }

    if (currentUser.onboardingCompleted) {
      // If images weren't claimed yet (app was killed mid-wizard), claim them now
      if (!onboardingState?.hasImages) {
        const token = await AsyncStorage.getItem('nima-onboarding-token');
        if (token) {
          try {
            await claimOnboardingImages({ onboardingToken: token });
          } catch {
            // Non-fatal — images may already be claimed or token may have expired
          }
        }
      }
      await clearStoredOnboardingData();
      setCompleted(true);
      return;
    }

    // Check for stored onboarding data
    const storedData = await getStoredOnboardingData();
    if (!storedData) {
      setCompleted(true);
      return;
    }

    // Validate stored data has required fields
    const requiredFields = [
      'gender', 'age', 'stylePreferences', 'shirtSize', 'waistSize',
      'height', 'heightUnit', 'shoeSize', 'shoeSizeUnit', 'country',
      'currency', 'budgetRange',
    ] as const;

    const missingFields = requiredFields.filter((f) => !storedData[f]);
    if (missingFields.length > 0) {
      console.log('[ONBOARDING] Incomplete stored data, missing:', missingFields);
      setCompleted(true);
      return;
    }

    // Start processing
    processingRef.current = true;

    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Complete onboarding with stored profile data
      await completeOnboarding({
        gender: storedData.gender,
        age: storedData.age,
        stylePreferences: storedData.stylePreferences,
        shirtSize: storedData.shirtSize,
        waistSize: storedData.waistSize,
        height: storedData.height,
        heightUnit: storedData.heightUnit,
        shoeSize: storedData.shoeSize,
        shoeSizeUnit: storedData.shoeSizeUnit,
        country: storedData.country,
        currency: storedData.currency,
        budgetRange: storedData.budgetRange,
      });

      // Step 2: Claim uploaded onboarding images
      if (storedData.onboardingToken) {
        try {
          const claimResult = await retryWithBackoff(
            () => claimOnboardingImages({ onboardingToken: storedData.onboardingToken! }),
            3,
            500
          );
          console.log(`[ONBOARDING_COMPLETION] Claimed ${claimResult.claimedCount} onboarding images`);
        } catch (claimError) {
          console.error('[ONBOARDING_COMPLETION] Failed to claim images:', claimError);
        }
      }

      // NOTE: Workflow will be triggered on the discover page, not here
      // This allows us to show proper loading UI to the user

      await clearStoredOnboardingData();
      console.log('[ONBOARDING_COMPLETION] Onboarding completed successfully');
      setCompleted(true);
    } catch (err) {
      console.error('[ONBOARDING] Failed to complete:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [user, onboardingState, getOrCreateUser, completeOnboarding, markOnboardingComplete, claimOnboardingImages]);

  useEffect(() => {
    processOnboarding();
  }, [user, onboardingState, processOnboarding]);

  const needsOnboarding =
    onboardingState !== undefined &&
    onboardingState.isAuthenticated &&
    onboardingState.hasUser &&
    !onboardingState.onboardingCompleted &&
    (!onboardingState.hasProfileData || !onboardingState.hasImages);

  return {
    user,
    isProcessing,
    error,
    completed,
    needsOnboarding,
    onboardingState,
  };
}

/**
 * Check if there's pending onboarding data.
 */
export async function hasPendingOnboardingData(): Promise<boolean> {
  return (await getStoredOnboardingData()) !== null;
}

export { clearStoredOnboardingData };

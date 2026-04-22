/**
 * Analytics module for Nima Native.
 * 
 * Port of the web's lib/analytics.ts.
 * Uses PostHog React Native SDK when available, otherwise no-ops gracefully.
 * 
 * PostHog RN SDK can be added later with:
 *   npm install posthog-react-native
 * 
 * For now, all functions log in __DEV__ mode and no-op in production.
 * This ensures analytics call sites work immediately without blocking
 * feature development on the PostHog RN SDK integration.
 */

// ---------- Event Constants ----------

export const ANALYTICS_EVENTS = {
  // Gate/Landing events
  GET_STARTED_CLICKED: 'get_started_clicked',
  SIGNIN_LINK_CLICKED: 'signin_link_clicked',

  // Onboarding step events
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_BACK_CLICKED: 'onboarding_back_clicked',

  // Specific interaction events
  GENDER_SELECTED: 'gender_selected',
  STYLE_PREFERENCE_TOGGLED: 'style_preference_toggled',
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_REMOVED: 'photo_removed',

  // Account events
  SIGNUP_INITIATED: 'signup_initiated',
  SIGNIN_CLICKED: 'signin_clicked',
  COMPLETE_PROFILE_CLICKED: 'complete_profile_clicked',

  // Completion events
  ONBOARDING_COMPLETED: 'onboarding_completed',
  START_EXPLORING_CLICKED: 'start_exploring_clicked',

  // Page events
  DISCOVER_PAGE_VIEWED: 'discover_page_viewed',
  CHAT_PAGE_VIEWED: 'chat_page_viewed',
  LOOK_DETAIL_VIEWED: 'look_detail_viewed',
  ACTIVITY_PAGE_VIEWED: 'activity_page_viewed',
  FITTING_ROOM_VIEWED: 'fitting_room_viewed',
  CART_PAGE_VIEWED: 'cart_page_viewed',
  EXPLORE_PAGE_VIEWED: 'explore_page_viewed',
  PROFILE_PAGE_VIEWED: 'profile_page_viewed',
  LOOKBOOKS_PAGE_VIEWED: 'lookbooks_page_viewed',
  MESSAGES_PAGE_VIEWED: 'messages_page_viewed',

  // Purchase events
  PURCHASE_ATTEMPTED: 'purchase_attempted',
  ITEMS_UNAVAILABLE_SHOWN: 'items_unavailable_shown',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ---------- Onboarding Step Constants ----------

export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  GENDER_AGE: 'gender_age',
  STYLE_VIBE: 'style_vibe',
  SIZE_FIT: 'size_fit',
  LOCATION_BUDGET: 'location_budget',
  PHOTO_UPLOAD: 'photo_upload',
  ACCOUNT: 'account',
  SUCCESS: 'success',
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export const STEP_NUMBERS: Record<OnboardingStep, number> = {
  [ONBOARDING_STEPS.WELCOME]: 0,
  [ONBOARDING_STEPS.GENDER_AGE]: 1,
  [ONBOARDING_STEPS.STYLE_VIBE]: 2,
  [ONBOARDING_STEPS.SIZE_FIT]: 3,
  [ONBOARDING_STEPS.LOCATION_BUDGET]: 4,
  [ONBOARDING_STEPS.PHOTO_UPLOAD]: 5,
  [ONBOARDING_STEPS.ACCOUNT]: 6,
  [ONBOARDING_STEPS.SUCCESS]: 7,
};

const TOTAL_STEPS = 8;

// ---------- Debounce ----------

const lastTrackedEvent = new Map<string, number>();
const EVENT_DEBOUNCE_MS = 1000;

function shouldDebounceEvent(eventName: string): boolean {
  const now = Date.now();
  const lastTime = lastTrackedEvent.get(eventName) || 0;

  if (now - lastTime < EVENT_DEBOUNCE_MS) {
    return true;
  }

  lastTrackedEvent.set(eventName, now);
  return false;
}

// ---------- PostHog Integration ----------

/**
 * PostHog client instance. Set via initAnalytics() when PostHog RN SDK
 * is installed. Until then, all tracking functions are no-ops.
 */
let posthogClient: {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
} | null = null;

/**
 * Initialize analytics with a PostHog client.
 * Call this from the root layout after installing posthog-react-native.
 *
 * Example:
 * ```ts
 * import PostHog from 'posthog-react-native';
 * import { initAnalytics } from '@/lib/analytics';
 *
 * const posthog = new PostHog('phc_xxx', { host: 'https://us.i.posthog.com' });
 * initAnalytics(posthog);
 * ```
 */
export function initAnalytics(client: typeof posthogClient): void {
  posthogClient = client;
}

function isReady(): boolean {
  return posthogClient !== null;
}

// ---------- Core Tracking ----------

export function trackEvent(
  eventName: AnalyticsEvent | string,
  properties?: Record<string, unknown>
): void {
  if (__DEV__) {
    console.log(`[Analytics] ${eventName}`, properties || '');
  }
  if (!isReady()) return;
  posthogClient!.capture(eventName, properties);
}

// ---------- Onboarding Tracking ----------

export function trackStepViewed(step: OnboardingStep): void {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, {
    step,
    step_number: STEP_NUMBERS[step],
    total_steps: TOTAL_STEPS,
  });
}

export function trackStepCompleted(
  step: OnboardingStep,
  properties?: Record<string, unknown>
): void {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
    step,
    step_number: STEP_NUMBERS[step],
    total_steps: TOTAL_STEPS,
    ...properties,
  });
}

export function trackBackClicked(step: OnboardingStep): void {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_BACK_CLICKED, {
    step,
    step_number: STEP_NUMBERS[step],
  });
}

export function trackGetStarted(): void {
  trackEvent(ANALYTICS_EVENTS.GET_STARTED_CLICKED, { source: 'gate_splash' });
}

export function trackSignInLinkClicked(): void {
  trackEvent(ANALYTICS_EVENTS.SIGNIN_LINK_CLICKED, { source: 'gate_splash' });
}

export function trackGenderSelected(gender: string): void {
  trackEvent(ANALYTICS_EVENTS.GENDER_SELECTED, {
    gender,
    step: ONBOARDING_STEPS.GENDER_AGE,
  });
}

export function trackStylePreferenceToggled(style: string, selected: boolean): void {
  trackEvent(ANALYTICS_EVENTS.STYLE_PREFERENCE_TOGGLED, {
    style,
    selected,
    step: ONBOARDING_STEPS.STYLE_VIBE,
  });
}

export function trackPhotoUploaded(photoCount: number): void {
  trackEvent(ANALYTICS_EVENTS.PHOTO_UPLOADED, {
    photo_count: photoCount,
    step: ONBOARDING_STEPS.PHOTO_UPLOAD,
  });
}

export function trackPhotoRemoved(photoCount: number): void {
  trackEvent(ANALYTICS_EVENTS.PHOTO_REMOVED, {
    remaining_count: photoCount,
    step: ONBOARDING_STEPS.PHOTO_UPLOAD,
  });
}

export function trackSignupInitiated(method: 'google' | 'email'): void {
  trackEvent(ANALYTICS_EVENTS.SIGNUP_INITIATED, {
    method,
    step: ONBOARDING_STEPS.ACCOUNT,
  });
}

export function trackSignInClicked(): void {
  trackEvent(ANALYTICS_EVENTS.SIGNIN_CLICKED, { step: ONBOARDING_STEPS.ACCOUNT });
}

export function trackCompleteProfileClicked(): void {
  trackEvent(ANALYTICS_EVENTS.COMPLETE_PROFILE_CLICKED, { step: ONBOARDING_STEPS.ACCOUNT });
}

export function trackOnboardingCompleted(properties?: {
  gender?: string;
  age?: string;
  style_count?: number;
  country?: string;
  budget_range?: string;
  photo_count?: number;
}): void {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
    step: ONBOARDING_STEPS.SUCCESS,
    step_number: STEP_NUMBERS[ONBOARDING_STEPS.SUCCESS],
    total_steps: TOTAL_STEPS,
    ...properties,
  });
}

export function trackStartExploringClicked(): void {
  trackEvent(ANALYTICS_EVENTS.START_EXPLORING_CLICKED, { destination: '/discover' });
}

// ---------- Page View Tracking ----------

export function trackDiscoverPageViewed(properties?: {
  has_workflow?: boolean;
  is_authenticated?: boolean;
}): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.DISCOVER_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.DISCOVER_PAGE_VIEWED, properties);
}

export function trackChatPageViewed(properties?: {
  has_existing_thread?: boolean;
}): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.CHAT_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.CHAT_PAGE_VIEWED, properties);
}

export function trackLookDetailViewed(properties: {
  look_id: string;
  source?: 'discover' | 'explore' | 'fitting' | 'share' | 'direct';
}): void {
  if (shouldDebounceEvent(`${ANALYTICS_EVENTS.LOOK_DETAIL_VIEWED}_${properties.look_id}`)) return;
  trackEvent(ANALYTICS_EVENTS.LOOK_DETAIL_VIEWED, properties);
}

export function trackActivityPageViewed(properties?: { unread_count?: number }): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.ACTIVITY_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.ACTIVITY_PAGE_VIEWED, properties);
}

export function trackFittingRoomViewed(properties?: {
  has_looks?: boolean;
  look_count?: number;
}): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.FITTING_ROOM_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.FITTING_ROOM_VIEWED, properties);
}

export function trackCartPageViewed(properties?: {
  item_count?: number;
  total_value?: number;
  currency?: string;
}): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.CART_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.CART_PAGE_VIEWED, properties);
}

export function trackExplorePageViewed(properties?: { tab?: string }): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.EXPLORE_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.EXPLORE_PAGE_VIEWED, properties);
}

export function trackProfilePageViewed(): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.PROFILE_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.PROFILE_PAGE_VIEWED);
}

export function trackLookbooksPageViewed(properties?: { lookbook_count?: number }): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.LOOKBOOKS_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.LOOKBOOKS_PAGE_VIEWED, properties);
}

export function trackMessagesPageViewed(properties?: { unread_count?: number }): void {
  if (shouldDebounceEvent(ANALYTICS_EVENTS.MESSAGES_PAGE_VIEWED)) return;
  trackEvent(ANALYTICS_EVENTS.MESSAGES_PAGE_VIEWED, properties);
}

// ---------- User Identity ----------

export function identifyUser(
  userId: string,
  properties?: { email?: string; name?: string; created_at?: string }
): void {
  if (__DEV__) {
    console.log(`[Analytics] Identify: ${userId}`, properties || '');
  }
  if (!isReady()) return;
  posthogClient!.identify(userId, properties);
}

export function resetUser(): void {
  if (__DEV__) {
    console.log('[Analytics] Reset user');
  }
  if (!isReady()) return;
  posthogClient!.reset();
}

// ---------- Purchase Tracking ----------

export function trackPurchaseAttempted(properties: {
  source: 'look_detail' | 'fitting_room';
  item_count: number;
  total_price: number;
  currency: string;
  look_id?: string;
  session_id?: string;
}): void {
  trackEvent(ANALYTICS_EVENTS.PURCHASE_ATTEMPTED, properties);
}

export function trackItemsUnavailableShown(properties: {
  source: 'look_detail' | 'fitting_room';
  look_id: string;
  total_items: number;
  available_items: number;
  unavailable_count: number;
}): void {
  trackEvent(ANALYTICS_EVENTS.ITEMS_UNAVAILABLE_SHOWN, properties);
}

// Mock data for Ask Nima chat feature (ported from Next.js)

// ============================================================================
// Nima Greetings (gender-neutral, playful)
// ============================================================================

export const nimaGreetings = [
  "Hey there! What are we styling today? ✨",
  "Ready to find your next favorite look?",
  "Let's create some magic together! What's the occasion?",
  "Hey there! Tell me what you need 💫",
  "What's on your mind? Let's find the perfect fit!",
  "Style time! What look are we going for?",
  "Hey! Ready to discover something amazing?",
  "Let's get you looking incredible! What's up?",
];

// ============================================================================
// Quick Prompt Suggestions
// ============================================================================

export const quickPrompts = [
  {
    id: 'wedding',
    text: "I need a wedding guest outfit for...",
    icon: '💒',
  },
  {
    id: 'birthday',
    text: "Style me for a birthday celebration",
    icon: '🎂',
  },
  {
    id: 'work',
    text: "New work wardrobe essentials",
    icon: '💼',
  },
  {
    id: 'brunch',
    text: "Casual weekend brunch look",
    icon: '🥐',
  },
  {
    id: 'date',
    text: "First date outfit ideas",
    icon: '💕',
  },
  {
    id: 'vacation',
    text: "Vacation packing must-haves",
    icon: '✈️',
  },
  {
    id: 'interview',
    text: "Job interview power outfit",
    icon: '🎯',
  },
  {
    id: 'night-out',
    text: "Night out with friends",
    icon: '🌙',
  },
];

// ============================================================================
// Searching Status Messages
// ============================================================================

export const searchingMessages = [
  "Understanding your style...",
  "Browsing the latest collections...",
  "Curating perfect looks for you...",
  "Finding pieces that match your vibe...",
  "Almost there, just adding finishing touches...",
  "Putting together some amazing options...",
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getRandomGreeting(): string {
  return nimaGreetings[Math.floor(Math.random() * nimaGreetings.length)];
}

export function getRandomSearchingMessage(): string {
  return searchingMessages[Math.floor(Math.random() * searchingMessages.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

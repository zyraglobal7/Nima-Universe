export type BudgetRange = 'low' | 'mid' | 'premium';
export type Gender = 'male' | 'female' | 'prefer-not-to-say';

/** Uploaded image with per-photo validation state */
export interface ValidatedImage {
  imageId: string;
  storageId: string;
  filename: string;
  previewUrl: string;
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid';
  validationMessage?: string;
}

export interface OnboardingFormData {
  gender: Gender | '';
  stylePreferences: string[];
  occasions: string[];
  budgetRange: BudgetRange;
  uploadedImages: ValidatedImage[];
  onboardingToken: string;
}

export interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

export const TOTAL_STEPS = 4;

export const BUDGET_OPTIONS: {
  value: BudgetRange;
  label: string;
  description: string;
  range: string;
}[] = [
  {
    value: 'low',
    label: 'Smart Saver',
    description: "Great finds that won't break the bank",
    range: 'Up to KES 2,000',
  },
  {
    value: 'mid',
    label: 'Best of Both',
    description: 'Quality meets value',
    range: 'KES 2,000 – 10,000',
  },
  {
    value: 'premium',
    label: 'Treat Yourself',
    description: "As long as it's nice",
    range: 'KES 10,000+',
  },
];

export const OCCASION_OPTIONS: { value: string; label: string }[] = [
  { value: 'work', label: 'Work / Office' },
  { value: 'casual', label: 'Casual Hangouts' },
  { value: 'dates', label: 'Dates & Nights Out' },
  { value: 'events', label: 'Events & Weddings' },
  { value: 'fitness', label: 'Active / Fitness' },
  { value: 'all', label: 'All of the above' },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

import type { ImageSourcePropType } from 'react-native';

export interface StyleVibeCard {
  id: string;
  title: string;
  image: ImageSourcePropType;
  tags: string[];
}

export const STYLE_VIBE_CARDS: StyleVibeCard[] = [
  { id: '1', title: 'Classic, Preppy', image: require('../../assets/ClassicPrepp.jpeg'), tags: ['Classic', 'Preppy'] },
  { id: '2', title: 'Minimalist, Casual', image: require('../../assets/minimalistcasua.jpeg'), tags: ['Minimalist', 'Casual'] },
  { id: '3', title: 'Neutrals, Classic', image: require('../../assets/Neutralsclassi.jpeg'), tags: ['Neutrals', 'Classic'] },
  { id: '4', title: 'Sporty, Gym Wear', image: require('../../assets/Sportygymwea.jpeg'), tags: ['Sporty', 'Casual'] },
  { id: '5', title: 'Streetwear, Edgy', image: require('../../assets/StreetwearEdg.jpeg'), tags: ['Streetwear', 'Edgy'] },
  { id: '6', title: 'Trendy, Casual', image: require('../../assets/TrendyCasua.jpeg'), tags: ['Trendy', 'Casual'] },
  { id: '7', title: 'Vintage, Romantic', image: require('../../assets/VintageRomantic.jpeg'), tags: ['Vintage', 'Romantic'] },
  { id: '8', title: 'Formal, Elegant', image: require('../../assets/FormalElegan.jpeg'), tags: ['Formal', 'Elegant'] },
];

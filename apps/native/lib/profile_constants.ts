import { ImageSourcePropType } from "react-native";

export const STYLE_OUTFIT_IMAGES: { id: string; source: ImageSourcePropType; tags: string[] }[] = [
  { id: '1', source: require('@/assets/style/minimalist, casual.png'), tags: ['Casual', 'Minimalist'] },
  { id: '2', source: require('@/assets/style/Formal, Elegant.png'), tags: ['Formal', 'Elegant'] },
  { id: '3', source: require('@/assets/style/Streetwear, Edgy.png'), tags: ['Streetwear', 'Edgy'] },
  { id: '4', source: require('@/assets/style/Sporty, gym wear.png'), tags: ['Sporty', 'Casual'] },
  { id: '5', source: require('@/assets/style/Classic, Preppy.png'), tags: ['Classic', 'Preppy'] },
  { id: '6', source: require('@/assets/style/Vintage, Romantic, .png'), tags: ['Vintage', 'Romantic'] },
  { id: '7', source: require('@/assets/style/Neutrals, classic.png'), tags: ['Neutrals', 'Classic'] },
  { id: '8', source: require('@/assets/style/Trendy, Casual.png'), tags: ['Casual', 'Sporty'] },
];

export const STYLE_TAGS = [
  'Casual',
  'Formal',
  'Streetwear',
  'Minimalist',
  'Bohemian',
  'Vintage',
  'Sporty',
  'Elegant',
  'Edgy',
  'Preppy',
  'Romantic',
  'Classic',
];

export type BudgetRange = 'low' | 'mid' | 'premium';
export type Gender = 'male' | 'female' | 'prefer-not-to-say';
export type HeightUnit = 'cm' | 'ft';
export type ShoeSizeUnit = 'EU' | 'US' | 'UK';

export const BUDGET_OPTIONS: { 
  value: BudgetRange; 
  label: string; 
  description: string;
  range: string;
  icon: string;
}[] = [
  { 
    value: 'low', 
    label: 'Smart Saver', 
    description: 'Great finds that won\'t break the bank',
    range: 'Up to KES 2,000',
    icon: '🏷️',
  },
  { 
    value: 'mid', 
    label: 'Best of Both', 
    description: 'Quality meets value',
    range: 'KES 2,000 - 10,000',
    icon: '⚖️',
  },
  { 
    value: 'premium', 
    label: 'Treat Yourself', 
    description: 'As long as it\'s nice',
    range: 'KES 10,000+',
    icon: '✨',
  },
];

export const SIZE_OPTIONS = {
  shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  waist: ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66', '68', '70', '72'],
  shoe: {
    EU: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
    US: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
    UK: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
  },
};

export const COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'KES', emoji: '🇰🇪', phoneCode: '+254' },
];

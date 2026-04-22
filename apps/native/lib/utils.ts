import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind CSS class names with conflict resolution.
 * Same utility as the Next.js source project.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

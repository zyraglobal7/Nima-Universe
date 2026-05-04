import { CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const sizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function VerifiedBadge({ size = 'sm', showTooltip = true }: VerifiedBadgeProps) {
  const icon = (
    <CheckCircle2
      className={`${sizes[size]} text-blue-500 fill-white flex-shrink-0`}
      aria-label="Nima Verified Seller"
    />
  );

  if (!showTooltip) return icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-48 text-center">
          Nima Verified Seller — physically vetted by the Nima team
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}

export const FloatingActionButton = ({ 
  children, 
  onClick, 
  className, 
  ariaLabel, 
  disabled = false 
}: FloatingActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-20 right-4 lg:hidden",
        "w-14 h-14 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-all duration-200 ease-in-out",
        "z-40",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      size="icon"
    >
      {children}
    </Button>
  );
};
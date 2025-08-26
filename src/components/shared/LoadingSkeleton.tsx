import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'table' | 'cards' | 'calendar' | 'form';
  className?: string;
}

export const LoadingSkeleton = ({ variant = 'table', className }: LoadingSkeletonProps) => {
  switch (variant) {
    case 'table':
      return (
        <div className={cn("space-y-4", className)} role="status" aria-label="Cargando datos">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[80px]" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'cards':
      return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-label="Cargando datos">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'calendar':
      return (
        <div className={cn("space-y-4", className)} role="status" aria-label="Cargando calendario">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, dayIndex) => (
              <div key={dayIndex} className="space-y-2">
                <Skeleton className="h-6 w-full" />
                {Array.from({ length: 10 }).map((_, slotIndex) => (
                  <Skeleton key={slotIndex} className="h-12 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case 'form':
      return (
        <div className={cn("space-y-6", className)} role="status" aria-label="Cargando formulario">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>
      );

    default:
      return (
        <div className={cn("space-y-4", className)} role="status" aria-label="Cargando">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      );
  }
};
const block = 'animate-pulse rounded bg-neutral-200';

export const Skeleton = ({ className = '' }) => <div className={`${block} ${className}`} aria-hidden="true" />;

export const GridSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0" aria-hidden="true">
    <div className="h-10 bg-primary" />
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  </div>
);

const CardSkeleton = () => (
  <article className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-7 w-32" />
  </article>
);

export const Loading = ({ variant = 'page', label = 'Loading' }) => (
  <div role="status" aria-busy="true" aria-label={label}>
    {variant === 'session' && (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-28" />
      </div>
    )}
    {variant === 'list' && (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )}
    {variant === 'form' && (
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
        <Skeleton className="h-10 w-24" />
      </div>
    )}
    {variant === 'detail' && (
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <GridSkeleton />
      </div>
    )}
    {variant === 'dashboard' && (
      <section className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
        <Skeleton className="h-6 w-28" />
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <Skeleton className="h-6 w-44" />
        <GridSkeleton />
      </section>
    )}
    {variant === 'reports' && (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
        <GridSkeleton />
      </div>
    )}
    {variant === 'page' && (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <GridSkeleton />
      </div>
    )}
  </div>
);

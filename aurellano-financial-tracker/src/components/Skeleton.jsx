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

const TabRowSkeleton = () => (
  <div className="flex gap-6 border-b border-neutral-200 pb-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-36" />
  </div>
);

const CardGridSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, index) => (
      <article key={index} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </article>
    ))}
  </div>
);

const DayListSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="space-y-2 border-b border-neutral-200 px-3 py-3 last:border-b-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const EntryListSkeleton = () => (
  <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-neutral-200 lg:overflow-hidden lg:rounded-lg lg:border lg:border-neutral-200 lg:bg-neutral-0">
    {Array.from({ length: 4 }, (_, index) => (
      <li
        key={index}
        className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4 lg:flex lg:items-center lg:justify-between lg:space-y-0 lg:rounded-none lg:border-0"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
        </div>
      </li>
    ))}
  </ul>
);

const DashboardSummarySkeleton = () => (
  <>
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
  </>
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
    {variant === 'cards' && <CardGridSkeleton />}
    {variant === 'days' && <DayListSkeleton />}
    {variant === 'entries' && <EntryListSkeleton />}
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
      <div className="space-y-6">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-56" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <TabRowSkeleton />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    )}
    {variant === 'dashboard' && (
      <section className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <TabRowSkeleton />
        <DashboardSummarySkeleton />
      </section>
    )}
    {variant === 'dashboardTransactions' && (
      <section className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <TabRowSkeleton />
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
      </div>
    )}
    {variant === 'reportExpenses' && <GridSkeleton />}
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

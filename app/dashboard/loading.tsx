export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-muted lg:col-span-1" />
        <div className="h-48 animate-pulse rounded-xl bg-muted lg:col-span-2" />
      </div>
    </div>
  )
}

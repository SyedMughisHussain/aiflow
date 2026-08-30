export default function BillingLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-muted lg:col-span-1" />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

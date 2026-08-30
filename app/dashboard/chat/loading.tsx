export default function ChatLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <div className="h-[32rem] animate-pulse rounded-lg bg-muted" />
      <div className="h-[32rem] animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

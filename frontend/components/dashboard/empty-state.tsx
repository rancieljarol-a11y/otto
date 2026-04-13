export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-6 text-sm text-muted-foreground">{message}</div>
}

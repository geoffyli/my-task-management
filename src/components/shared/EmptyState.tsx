interface Props {
  message?: string;
}

export function EmptyState({ message = "No data available" }: Props) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <p className="text-[13px] font-[510] text-foreground-quaternary">{message}</p>
    </div>
  );
}

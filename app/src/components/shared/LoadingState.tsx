export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-foreground-tertiary text-[13px] font-[510]">
      {message}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <p className="text-muted">
      Coming soon — {label} will be available in a future update.
    </p>
  );
}

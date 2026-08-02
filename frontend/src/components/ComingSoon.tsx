export function ComingSoon({ label }: { label: string }) {
  return (
    <p className="text-slate-500">
      Coming soon — {label} will be available in a future update.
    </p>
  );
}

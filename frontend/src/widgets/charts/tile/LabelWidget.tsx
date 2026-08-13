'use client';

export interface LabelWidgetProps {
  text: string;
  align?: 'left' | 'center';
}

/** Static text — no datasource. `{text}` as a JSX child is what makes this XSS-safe: React
 * escapes text nodes by default, so no sanitizer/dangerouslySetInnerHTML is needed here. */
export function LabelWidget({ text, align = 'left' }: LabelWidgetProps) {
  return (
    <div className="glass-card flex h-full items-center p-4">
      <p className={`whitespace-pre-wrap text-sm text-body ${align === 'center' ? 'w-full text-center' : ''}`}>
        {text}
      </p>
    </div>
  );
}

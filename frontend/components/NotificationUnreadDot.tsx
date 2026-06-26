import React from 'react';

export function NotificationUnreadDot({ title }: { title?: string }) {
  return (
    <span
      className="inline-flex shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100 animate-pulse"
      title={title}
      aria-label={title}
      role="status"
    />
  );
}

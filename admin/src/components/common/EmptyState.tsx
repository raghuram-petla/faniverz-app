// @contract Renders a centered empty state message for admin list/table pages.
// @assumes Used at the top level of a page's content area (not inside a table row or grid cell).
export interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <div className="text-center py-20 text-on-surface-subtle">{message}</div>;
}

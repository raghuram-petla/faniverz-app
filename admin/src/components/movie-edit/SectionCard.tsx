// @contract reusable card wrapper for each section/sub-section within a tab
// @edge action slot renders right-aligned in the header (e.g. "+ Add" button)
export interface SectionCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionCard({ title, icon: Icon, children, action }: SectionCardProps) {
  return (
    <div className="bg-surface-muted border border-outline-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <Icon className="w-5 h-5" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

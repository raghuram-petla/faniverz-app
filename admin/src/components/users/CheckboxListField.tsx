// @contract: Reusable checkbox list field used in invite forms for PH and language assignment
export interface CheckboxListFieldProps {
  label: string;
  hint?: string;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
}

export function CheckboxListField({
  label,
  hint,
  items,
  selectedIds,
  onToggle,
  emptyMessage,
}: CheckboxListFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-2">
        {label}
        {hint && <span className="text-on-surface-subtle font-normal"> {hint}</span>}
      </label>
      <div className="space-y-2 max-h-48 overflow-y-auto border border-outline rounded-lg p-3">
        {items.length === 0 && <p className="text-sm text-on-surface-subtle">{emptyMessage}</p>}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-elevated rounded-lg px-2 py-1.5"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="rounded border-outline accent-red-600"
            />
            <span className="text-sm text-on-surface">{item.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

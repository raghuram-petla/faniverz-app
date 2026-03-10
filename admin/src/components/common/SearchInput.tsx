'use client';
import { Search, Loader2 } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  isLoading,
  className,
}: SearchInputProps) {
  return (
    <div className={`relative${className ? ` ${className}` : ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input rounded-lg pl-10 pr-10 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle animate-spin" />
      )}
    </div>
  );
}

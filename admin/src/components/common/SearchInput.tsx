'use client';
import { Search, Loader2 } from 'lucide-react';

// @contract controlled input — parent owns value, receives changes via onChange
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
    <div className={`relative flex-1${className ? ` ${className}` : ''}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-subtle" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input rounded-lg pl-11 pr-11 py-3 text-base text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
      />
      {/* @nullable isLoading — only shows spinner when explicitly true */}
      {isLoading && (
        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-subtle animate-spin" />
      )}
    </div>
  );
}

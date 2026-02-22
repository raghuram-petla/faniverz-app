'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split('/').filter(Boolean) ?? [];

  if (segments.length === 0) {
    return (
      <span data-testid="breadcrumbs" className="text-sm text-gray-600">
        Dashboard
      </span>
    );
  }

  return (
    <nav data-testid="breadcrumbs" className="flex items-center gap-2 text-sm text-gray-600">
      <Link href="/" className="hover:text-gray-900">
        Dashboard
      </Link>
      {segments.map((segment, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        const isLast = idx === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            {isLast ? (
              <span className="font-medium text-gray-900">{label}</span>
            ) : (
              <Link href={href} className="hover:text-gray-900">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'elevated' | 'bordered' | 'subtle';

// @invariant every CardVariant maps to a unique visual treatment; keep in sync with design tokens
const VARIANT_CLASSES: Record<CardVariant, string> = {
  elevated: 'bg-surface-elevated rounded-xl',
  bordered: 'bg-surface-card border border-outline rounded-xl',
  subtle: 'bg-input rounded-xl',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const PADDING_CLASSES = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'p-6',
} as const;

export function Card({
  variant = 'elevated',
  padding = 'md',
  children,
  className,
  ...divProps
}: CardProps) {
  // @contract merges variant + padding + caller className; falsy entries filtered out
  const classes = [VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div {...divProps} className={classes}>
      {children}
    </div>
  );
}

// ── Inline item card (horizontal flex layout for list items) ──

export interface CardItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardItem({ children, className, ...divProps }: CardItemProps) {
  const classes = [
    'flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...divProps} className={classes}>
      {children}
    </div>
  );
}

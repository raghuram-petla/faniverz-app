import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'blue'
  | 'icon'
  | 'overlay-yellow'
  | 'overlay-red';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-red-600 text-on-surface font-semibold hover:bg-red-700 disabled:opacity-50',
  secondary:
    'bg-input text-on-surface-muted hover:bg-input-hover hover:text-on-surface disabled:opacity-50',
  danger: 'bg-red-600/20 text-red-400 hover:bg-red-600/30',
  ghost: 'text-on-surface-muted hover:text-on-surface transition-colors',
  blue: 'bg-blue-600 text-white font-semibold hover:bg-blue-700 shrink-0',
  icon: 'rounded hover:bg-input text-on-surface-subtle hover:text-red-400',
  'overlay-yellow': 'bg-yellow-500 text-black font-semibold hover:bg-yellow-400',
  'overlay-red': 'bg-red-600 text-white font-semibold hover:bg-red-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-4 py-3 text-sm rounded-xl',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'p-1 rounded',
  md: 'p-1.5 rounded',
  lg: 'p-2 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className,
  ...buttonProps
}: ButtonProps) {
  const isIconOnly = variant === 'icon';
  const sizeClass = isIconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size];
  const widthClass = fullWidth ? 'w-full justify-center' : '';
  const layoutClass = children ? 'flex items-center gap-2' : 'flex items-center justify-center';

  const classes = [layoutClass, sizeClass, VARIANT_CLASSES[variant], widthClass, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <button {...buttonProps} className={classes}>
      {icon}
      {children}
    </button>
  );
}

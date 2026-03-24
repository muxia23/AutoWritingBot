/**
 * 按钮组件
 */

import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, outline
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  className = '',
  onClick,
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading ? 'btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 className="btn-spinner" size={16} />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </button>
  );
}

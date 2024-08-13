import clsx from 'clsx';
import React from 'react';

export function Form({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props}>{children}</form>;
}

export function FormField({
  className,
  label,
  description,
  error,
  children,
}: {
  className?: string;
  label?: string;
  description?: string;
  error?: string | boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('form-field', className, error && 'is-error')}>
      {label && <div className="form-label">{label}</div>}
      {description && <div className="form-description">{description}</div>}
      <div className="form-control">{children}</div>
      {typeof error === 'boolean' && <div className="form-error">{error}</div>}
    </div>
  );
}

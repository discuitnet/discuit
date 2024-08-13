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
  ...props
}: {
  className?: string;
  label?: string;
  description?: string;
  error?: string | boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('form-field', className, error && 'is-error')} {...props}>
      {label && <div className="form-label">{label}</div>}
      {description && <div className="form-description">{description}</div>}
      <div className="form-control">{children}</div>
      {typeof error === 'boolean' && <div className="form-error">{error}</div>}
    </div>
  );
}

export function FormSection({
  className,
  heading,
  children,
  ...props
}: {
  className?: string;
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('form-section', className)} {...props}>
      {heading && <div className="form-section-heading">{heading}</div>}
      <div className="form-section-body">{children}</div>
    </div>
  );
}

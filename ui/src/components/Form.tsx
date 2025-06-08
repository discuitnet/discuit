import clsx from 'clsx';
import React from 'react';

export function Form({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props}>{children}</form>;
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  label?: string;
  description?: string;
  error?: string | boolean;
  children: React.ReactNode;
}

export function FormField({
  className,
  label,
  description,
  error,
  children,
  ...props
}: FormFieldProps) {
  return (
    <div className={clsx('form-field', className, error && 'is-error')} {...props}>
      {label && <div className="form-label">{label}</div>}
      {description && <div className="form-description">{description}</div>}
      <div className="form-control">{children}</div>
      {typeof error === 'string' && <div className="form-error">{error}</div>}
    </div>
  );
}

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  heading?: string;
  children: React.ReactNode;
}

export function FormSection({ className, heading, children, ...props }: FormSectionProps) {
  return (
    <div className={clsx('form-section', className)} {...props}>
      {heading && <div className="form-section-heading">{heading}</div>}
      <div className="form-section-body">{children}</div>
    </div>
  );
}

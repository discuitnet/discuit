import clsx from 'clsx';
import React, { ChangeEvent, forwardRef, useMemo, useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', error = false, ...rest }: InputProps,
  ref
) {
  return <input className={clsx(className, error && 'is-error')} type={type} ref={ref} {...rest} />;
});

export default Input;

export const InputWithCount = ({
  className,
  textarea = false,
  type = 'text',
  maxLength = 100,
  error = false,
  value,
  onChange,
  ...props
}: {
  className?: string;
  textarea: boolean;
  type: string;
  maxLength: number;
  error: boolean;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}) => {
  const length = value ? value.length : 0;
  return (
    <div className={clsx('input-with-limit', className)} {...props}>
      {textarea ? (
        <textarea value={value} onChange={onChange}></textarea>
      ) : (
        <input type={type} value={value} onChange={onChange} />
      )}
      <div className="input-count">{`${length} / ${maxLength}`}</div>
    </div>
  );
};

export function useInputMaxLength(maxLength: number, initial = '') {
  const [value, setValue] = useState(initial);
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
    let value = '';
    if (event instanceof Event) {
      value = (event as ChangeEvent<HTMLInputElement | HTMLTextAreaElement>).target.value;
    } else {
      value = event as string;
    }
    setValue(value.slice(0, maxLength));
  };
  return [value, handleChange];
}

const InputPasswordVisibleIcon = ({
  visible = true,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className="input-password-show flex flex-center"
      role="button"
      onClick={onClick}
      onKeyDown={onClick}
      tabIndex={-1}
      title={visible ? 'Hide password' : 'Show password'}
    >
      {!visible ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0V0zm0 0h24v24H0V0zm0 0h24v24H0V0zm0 0h24v24H0V0z" fill="none" />
          <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z" />
        </svg>
      )}
    </div>
  );
};

export const InputPassword = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error = false, value, ...props }: InputProps,
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const type = showPassword ? 'text' : 'password';
  const handleShowClick = () => setShowPassword((x) => !x);

  return (
    <div className={clsx('input-password', className)}>
      <input className={clsx(error && 'is-error')} ref={ref} type={type} value={value} {...props} />
      {value !== '' && (
        <InputPasswordVisibleIcon visible={showPassword} onClick={handleShowClick} />
      )}
    </div>
  );
});

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  variant?: 'checkbox' | 'switch';
}

export function Checkbox({ label, variant = 'checkbox', ...props }: CheckboxProps) {
  const id = useMemo(() => Math.round(Math.random() * 1000000), []).toString();
  return (
    <div className="checkbox">
      <Input
        className={clsx(variant === 'switch' && 'switch')}
        id={id}
        type="checkbox"
        {...props}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Radio({ label, ...props }: RadioProps) {
  const id = useMemo(() => Math.round(Math.random() * 1000000), []).toString();
  return (
    <div className="radio">
      <Input id={id} type="radio" {...props} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

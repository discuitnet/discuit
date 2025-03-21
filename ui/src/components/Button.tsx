import clsx from 'clsx';
import React, { useRef } from 'react';
import { SVGClose, SVGNotification, SVGSearch } from '../SVGs';
import Spinner from './Spinner';

type ButtonVariant = 'normal' | 'text';
type ButtonColor = 'main' | 'gray' | 'red';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  icon?: React.ReactElement;
  loading?: boolean;
}

const defaultButtonVariant: ButtonVariant = 'normal';
const defaultButtonColor: ButtonColor = 'gray';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = defaultButtonVariant,
      color = defaultButtonColor,
      icon,
      loading = false,
      children,
      disabled,
      ...props
    }: ButtonProps,
    ref
  ) => {
    const variantClsName = variant === 'text' ? 'is-text' : '';
    let colorClsName = '';
    if (color === 'main') {
      colorClsName = 'is-main';
    } else if (color === 'red') {
      colorClsName = 'is-red';
    }
    const cls = clsx(className, variantClsName, colorClsName, icon && !children ? 'is-icon' : null);

    return (
      <button className={cls ? cls : undefined} ref={ref} {...props} disabled={loading || disabled}>
        {loading && (
          <div className="button-icon button-spinner">
            <Spinner color="currentColor" />
          </div>
        )}
        <div className="button-inner" style={{ visibility: loading ? 'hidden' : undefined }}>
          {icon ? (
            <>
              {!loading && <span className="button-icon">{icon}</span>}
              {children && <span>{children}</span>}
            </>
          ) : (
            children
          )}
        </div>
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;

export const ButtonClose = ({
  className,
  style = {},
  ...props
}: {
  className?: string;
  style?: React.CSSProperties;
} & ButtonProps) => {
  const cls = 'button-icon' + (className ? ` ${className}` : '');
  return (
    <Button className={cls} style={{ padding: '9px', ...style }} {...props}>
      <SVGClose />
    </Button>
  );
};

export const ButtonMore = ({
  vertical = false,
  outlined = false,
  className,
  ...props
}: {
  vertical?: boolean;
  outlined?: boolean;
  className?: string;
} & ButtonProps) => {
  const style: React.CSSProperties = {
    transform: vertical ? 'rotate(90deg)' : 'initial',
  };
  const cls = 'button-icon' + (className ? ` ${className}` : '');
  const svg = outlined ? (
    <svg
      style={style}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 14.75C3.48 14.75 2.25 13.52 2.25 12C2.25 10.48 3.48 9.25 5 9.25C6.52 9.25 7.75 10.48 7.75 12C7.75 13.52 6.52 14.75 5 14.75ZM5 10.75C4.31 10.75 3.75 11.31 3.75 12C3.75 12.69 4.31 13.25 5 13.25C5.69 13.25 6.25 12.69 6.25 12C6.25 11.31 5.69 10.75 5 10.75Z"
        fill="currentColor"
      />
      <path
        d="M19 14.75C17.48 14.75 16.25 13.52 16.25 12C16.25 10.48 17.48 9.25 19 9.25C20.52 9.25 21.75 10.48 21.75 12C21.75 13.52 20.52 14.75 19 14.75ZM19 10.75C18.31 10.75 17.75 11.31 17.75 12C17.75 12.69 18.31 13.25 19 13.25C19.69 13.25 20.25 12.69 20.25 12C20.25 11.31 19.69 10.75 19 10.75Z"
        fill="currentColor"
      />
      <path
        d="M12 14.75C10.48 14.75 9.25 13.52 9.25 12C9.25 10.48 10.48 9.25 12 9.25C13.52 9.25 14.75 10.48 14.75 12C14.75 13.52 13.52 14.75 12 14.75ZM12 10.75C11.31 10.75 10.75 11.31 10.75 12C10.75 12.69 11.31 13.25 12 13.25C12.69 13.25 13.25 12.69 13.25 12C13.25 11.31 12.69 10.75 12 10.75Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
  return (
    <Button className={cls} {...props}>
      {svg}
    </Button>
  );
};

export const ButtonHamburger = ({ className, ...props }: { className?: string } & ButtonProps) => {
  const cls = 'button-hamburger' + (className ? ` ${className}` : '');
  return (
    <Button className={cls} {...props}>
      <div className="hamburger-lines">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </Button>
  );
};

export const ButtonSearch = ({
  className,
  noBackground = true,
  ...props
}: {
  className?: string;
  noBackground?: boolean;
} & ButtonProps) => {
  const cls =
    (noBackground ? 'button-clear' : 'button-icon') +
    ' button-search' +
    (className ? ` ${className}` : '');
  return (
    <Button className={cls} {...props}>
      <SVGSearch />
    </Button>
  );
};

export const ButtonNotifications = ({
  className,
  count = 0,
  iconVariant,
  ...props
}: { count?: number; iconVariant?: 'bold' | 'outline' } & ButtonProps) => {
  return (
    <Button
      className={clsx('notifications-button button-icon-simple', className)}
      icon={<SVGNotification variant={iconVariant} />}
      {...props}
    >
      {count > 0 && <span className="notifications-count">{count}</span>}
    </Button>
  );
};

export const ButtonUpload = ({
  children,
  onChange,
  ...rest
}: {
  children?: React.ReactNode;
  onChange?: (files: FileList | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleInputChange = () => {
    if (!(onChange && inputRef.current)) {
      return;
    }
    onChange(inputRef.current.files);
  };
  return (
    <div className="button-upload">
      <button onClick={() => inputRef.current && inputRef.current.click()} {...rest}>
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        name="image"
        style={{ visibility: 'hidden', width: 0, height: 0 }}
        onChange={handleInputChange}
      />
    </div>
  );
};

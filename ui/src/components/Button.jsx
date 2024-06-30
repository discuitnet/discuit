import React, { useRef } from 'react';
import PropTypes from 'prop-types';

export const ButtonClose = ({ className, style = {}, ...props }) => {
  const cls = 'button-icon' + (className ? ` ${className}` : '');
  return (
    <button className={cls} style={{ padding: '9px', ...style }} {...props}>
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512.001 512.001"
        xmlSpace="preserve"
      >
        <path
          d="M284.286,256.002L506.143,34.144c7.811-7.811,7.811-20.475,0-28.285c-7.811-7.81-20.475-7.811-28.285,0L256,227.717
			L34.143,5.859c-7.811-7.811-20.475-7.811-28.285,0c-7.81,7.811-7.811,20.475,0,28.285l221.857,221.857L5.858,477.859
			c-7.811,7.811-7.811,20.475,0,28.285c3.905,3.905,9.024,5.857,14.143,5.857c5.119,0,10.237-1.952,14.143-5.857L256,284.287
			l221.857,221.857c3.905,3.905,9.024,5.857,14.143,5.857s10.237-1.952,14.143-5.857c7.811-7.811,7.811-20.475,0-28.285
			L284.286,256.002z"
          strokeWidth={2}
        />
      </svg>
    </button>
  );
};

ButtonClose.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

export const ButtonMore = ({ vertical = false, outlined = false, className, ...props }) => {
  const style = { transform: vertical ? 'rotate(90deg)' : 'initial' };
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
    <button className={cls} {...props}>
      {svg}
    </button>
  );
};

ButtonMore.propTypes = {
  vertical: PropTypes.bool,
  outlined: PropTypes.bool,
  className: PropTypes.string,
};

export const ButtonHamburger = ({ className, ...props }) => {
  const cls = 'button-hamburger' + (className ? ` ${className}` : '');
  return (
    <button className={cls} {...props}>
      <div className="hamburger-lines">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </button>
  );
};

ButtonHamburger.propTypes = {
  className: PropTypes.string,
};

export const ButtonSearch = ({ className, noBackground = true, ...props }) => {
  const cls =
    (noBackground ? 'button-clear' : 'button-icon') +
    ' button-search' +
    (className ? ` ${className}` : '');
  return (
    <button className={cls} {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 21l-4.486-4.494M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z" />
      </svg>
    </button>
  );
};

ButtonSearch.propTypes = {
  className: PropTypes.string,
  noBackground: PropTypes.bool,
};

export const ButtonNotifications = ({ count = 0, ...props }) => {
  return (
    <button className="notifications-button button-icon-simple" {...props}>
      {count > 0 && <div className="notifications-count">{count}</div>}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.0196 2.91016C8.7096 2.91016 6.0196 5.60016 6.0196 8.91016V11.8002C6.0196 12.4102 5.7596 13.3402 5.4496 13.8602L4.2996 15.7702C3.5896 16.9502 4.0796 18.2602 5.3796 18.7002C9.6896 20.1402 14.3396 20.1402 18.6496 18.7002C19.8596 18.3002 20.3896 16.8702 19.7296 15.7702L18.5796 13.8602C18.2796 13.3402 18.0196 12.4102 18.0196 11.8002V8.91016C18.0196 5.61016 15.3196 2.91016 12.0196 2.91016Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
        />
        <path
          d="M13.8699 3.19994C13.5599 3.10994 13.2399 3.03994 12.9099 2.99994C11.9499 2.87994 11.0299 2.94994 10.1699 3.19994C10.4599 2.45994 11.1799 1.93994 12.0199 1.93994C12.8599 1.93994 13.5799 2.45994 13.8699 3.19994Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.4"
          d="M15.0195 19.0601C15.0195 20.7101 13.6695 22.0601 12.0195 22.0601C11.1995 22.0601 10.4395 21.7201 9.89953 21.1801C9.35953 20.6401 9.01953 19.8801 9.01953 19.0601"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
        />
      </svg>
    </button>
  );
};

ButtonNotifications.propTypes = {
  count: PropTypes.number,
};

export const ButtonUpload = ({ children, onChange, ...rest }) => {
  const inputRef = useRef(null);
  const handleInputChange = () => {
    if (!onChange) {
      return;
    }
    onChange(inputRef.current.files);
  };
  return (
    <div className="button-upload">
      <button onClick={() => inputRef.current.click()} {...rest}>
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

ButtonUpload.propTypes = {
  onChange: PropTypes.func.isRequired,
};

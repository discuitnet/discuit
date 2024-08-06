import PropTypes from 'prop-types';
import React from 'react';

const Spinner = ({ className, size, ...props }) => (
  <div className={'spinner-wrapper' + (className ? ` ${className}` : '')} {...props}>
    <svg
      className="spinner"
      viewBox="0 0 50 50"
      style={{ width: size ?? undefined, height: size ?? undefined }}
    >
      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
    </svg>
  </div>
);

Spinner.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default Spinner;

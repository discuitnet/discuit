import React from 'react';
import PropTypes from 'prop-types';

function Badge({ className = '', badge, ...props }) {
  const renderImage = () => {
    const { src, alt } = badgeImage(badge);
    return <img src={src} alt={alt} />;
  };
  return (
    <div className={'user-badge' + (className ? ` ${className}` : '')} {...props}>
      {renderImage()}
    </div>
  );
}

Badge.propTypes = {
  className: PropTypes.string,
  badge: PropTypes.object.isRequired,
};

export default Badge;

export function badgeImage(badge) {
  let src = '',
    alt = '';
  switch (badge.type) {
    case 'supporter':
      src = '/favicon.png';
      alt = 'supporter badge';
      break;
    default:
      throw new Error(`unkown badge type '${badge.type}'`);
  }
  return {
    src,
    alt,
  };
}

import PropTypes from 'prop-types';
import React from 'react';
import { badgeImage } from './badgeImage';

function Badge({ className = '', badge, ...props }) {
  const renderImage = () => {
    const { src, alt } = badgeImage(badge.type);
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

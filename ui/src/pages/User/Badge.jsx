import React from 'react';
import PropTypes from 'prop-types';
import BannerImg from '../../assets/imgs/community-banner.jpg';

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

export function badgeImage(type) {
  let src = '',
    alt = '';
  switch (type) {
    case 'supporter':
      src = BannerImg;
      alt = 'supporter badge';
      break;
    default:
      throw new Error(`unknown badge type '${type}'`);
  }
  return {
    src,
    alt,
  };
}

import React from 'react';
import { Badge as BadgeType } from '../../serverTypes';
import { badgeImage } from './badgeImage';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  badge: BadgeType;
}

function Badge({ className = '', badge, ...props }: BadgeProps) {
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

export default Badge;

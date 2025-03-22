import React from 'react';
import { useImageLoaded } from '../hooks';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  alt?: string;
  src?: string;
  onLoad?: () => void;
  backgroundColor?: string;
  style?: React.CSSProperties;
  isFullSize?: boolean;
}

export default function Image({
  className,
  alt,
  src,
  onLoad,
  backgroundColor,
  style = {},
  isFullSize = false,
  ...props
}: ImageProps) {
  const [loaded, _handleLoad] = useImageLoaded(src);
  const divStyle: React.CSSProperties = {},
    imgStyle: React.CSSProperties = { ...style };
  if (!loaded) {
    if (backgroundColor) {
      divStyle.background = backgroundColor;
    }
    imgStyle.opacity = 0;
  }

  const handleLoad = () => {
    _handleLoad();
    if (onLoad) {
      onLoad();
    }
  };

  let cls = 'image';
  if (isFullSize) cls += ' is-fullsize';
  if (!loaded) cls += ' is-loading';

  return (
    <div style={divStyle} className={cls + (className ? ` ${className}` : '')}>
      <img alt={alt} style={imgStyle} onLoad={handleLoad} src={src} {...props} />
    </div>
  );
}

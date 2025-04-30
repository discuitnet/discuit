import PropTypes from 'prop-types';
import React from 'react';
import { useImageLoaded } from '../hooks';

const Image = ({
  className,
  alt,
  src,
  onLoad,
  backgroundColor,
  style = {},
  isFullSize = false,
  ...props
}) => {
  const [loaded, _handleLoad] = useImageLoaded(src);
  const divStyle = {},
    imgStyle = { ...style };
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
      <img alt={alt} title={alt} style={imgStyle} onLoad={handleLoad} src={src} {...props} />
    </div>
  );
};

Image.propTypes = {
  className: PropTypes.string,
  src: PropTypes.string,
  alt: PropTypes.string,
  onLoad: PropTypes.func,
  backgroundColor: PropTypes.string,
  style: PropTypes.object,
  isFullSize: PropTypes.bool,
};

export default Image;

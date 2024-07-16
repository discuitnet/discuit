import React from 'react';
import PropTypes from 'prop-types';
import { useImageLoaded } from '../hooks';

const Image = ({ className, alt, backgroundColor, style = {}, isFullSize = false, ...props }) => {
  const [loaded, handleLoad] = useImageLoaded();
  const divStyle = {},
    _style = { ...style };
  if (backgroundColor) {
    divStyle.background = loaded ? 'none' : backgroundColor;
  }
  _style.opacity = loaded ? style.opacity ?? 1 : 0;

  let cls = 'image';
  if (isFullSize) cls += ' is-fullsize';

  return (
    <div style={divStyle} className={cls + (className ? ` ${className}` : '')}>
      <img alt={alt} style={_style} onLoad={handleLoad} {...props} />
    </div>
  );
};

Image.propTypes = {
  className: PropTypes.string,
  alt: PropTypes.string,
  backgroundColor: PropTypes.string,
  style: PropTypes.object,
  isFullSize: PropTypes.bool,
};

export default Image;

import PropTypes from 'prop-types';
import React from 'react';
import Image from './Image';

const ServerImage = ({ onLoad, image, sizes, style = {}, ...props }) => {
  let src = image.url,
    srcset = '';
  if (image.copies) {
    for (let i = 0; i < image.copies.length; i++) {
      const copy = image.copies[i];
      srcset += (i > 0 ? ', ' : '') + `${copy.url} ${copy.width}w`;
    }
  }
  srcset += (srcset !== '' ? ', ' : '') + `${src} ${image.width}w`;
  if (!sizes) sizes = '(max-width: 768px) 358px, 647px';

  return (
    <Image
      onLoad={onLoad}
      srcSet={srcset}
      sizes={sizes}
      src={src}
      alt={image.altText || ''}
      style={style}
      backgroundColor={style.backgroundColor ?? image.averageColor}
      {...props}
    />
  );
};

ServerImage.propTypes = {
  onLoad: PropTypes.func,
  image: PropTypes.object.isRequired,
  sizes: PropTypes.string,
  style: PropTypes.object,
};

export default ServerImage;

import React from 'react';
import PropTypes from 'prop-types';
import Image from './Image';

const CitraImage = ({ image, sizes, style = {}, ...props }) => {
  let src = image.url,
    srcset = '';
  if (image.copies) {
    for (let i = 0; i < image.copies.length; i++) {
      const c = image.copies[i];
      srcset += (i > 0 ? ', ' : '') + `${c.url} ${c.width}w`;
    }
  }
  srcset += (srcset !== '' ? ', ' : '') + `${src} ${image.width}w`;
  if (!sizes) sizes = '(max-width: 768px) 358px, 647px';

  // return (
  //   <img
  //     srcSet={srcset}
  //     sizes={sizes}
  //     src={src}
  //     alt=""
  //     style={{
  //       ...style,
  //       backgroundColor: style.backgroundColor ?? image.averageColor,
  //     }}
  //     {...props}
  //   />
  // );
  return (
    <Image
      srcSet={srcset}
      sizes={sizes}
      src={src}
      alt=""
      style={style}
      backgroundColor={style.backgroundColor ?? image.averageColor}
      {...props}
    />
  );
};

CitraImage.propTypes = {
  image: PropTypes.object.isRequired,
  sizes: PropTypes.string,
  style: PropTypes.object,
};

export default CitraImage;

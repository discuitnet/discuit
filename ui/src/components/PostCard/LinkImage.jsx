import PropTypes from 'prop-types';
import React from 'react';
import { useImageLoaded } from '../../hooks';

const LinkImage = ({ link, loading = 'lazy' }) => {
  const { image } = link;

  // let size;
  // if (window.innerWidth > 768) {
  //   size = { width: 325, height: 250 }; // desktop
  // } else {
  //   size = { width: 875, height: 500 }; //mobile
  // }
  // const src = image.url + `?size=${size.width}x${size.height}&fit=cover`; // desktop

  const { src, size } = (() => {
    const imageCopyName = window.innerWidth > 768 ? 'desktop' : 'mobile';
    const matches = image.copies.filter((copy) => copy.name === imageCopyName);
    let copy;
    if (matches.length === 0) {
      copy = image;
      console.error(`LinkImage.jsx: No matching image copy found (for image: ${image.url})`);
    } else {
      copy = matches[0];
    }
    return {
      src: copy.url,
      size: {
        width: copy.width,
        height: copy.height,
      },
    };
  })();

  const [loaded, handleLoad] = useImageLoaded();

  return (
    <div
      className="post-card-link-image-img"
      style={{
        backgroundColor: image.averageColor,
        backgroundImage: loaded ? `url('${src}')` : 'none',
      }}
    >
      <img
        src={src}
        alt=""
        loading={loading}
        width={size.width}
        height={size.height}
        onLoad={handleLoad}
      />
    </div>
  );
};

LinkImage.propTypes = {
  link: PropTypes.object.isRequired,
  loading: PropTypes.string,
};

export default LinkImage;

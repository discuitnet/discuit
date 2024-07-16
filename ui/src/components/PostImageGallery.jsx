import React from 'react';
import PropTypes from 'prop-types';
import ImageGallery from './ImageGallery';
import ServerImage from './ServerImage';

const PostImageGallery = ({ images = [], isMobile }) => {
  return (
    <ImageGallery className="post-image-gallery">
      {images.map((image) => (
        <Image image={image} isMobile={isMobile} />
      ))}
    </ImageGallery>
  );
};

PostImageGallery.propTypes = {
  images: PropTypes.array.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default PostImageGallery;

const Image = ({ image, isMobile }) => {
  return (
    <ServerImage
      image={image}
      loading="lazy"
      style={{
        height: isMobile ? '435px' : '520px',
      }}
    />
  );
};

Image.propTypes = {
  image: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

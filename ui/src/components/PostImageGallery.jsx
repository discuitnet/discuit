import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import ImageGallery from './ImageGallery';
import ServerImage from './ServerImage';
import { useDispatch } from 'react-redux';
import { postImageGalleryIndexUpdated } from '../slices/postsSlice';

const PostImageGallery = ({ post, isMobile, keyboardControlsOn = false }) => {
  const { images } = post;

  const dispatch = useDispatch();
  const handleIndexChange = (index) => {
    dispatch(postImageGalleryIndexUpdated(post.publicId, index));
  };

  return (
    <ImageGallery
      className="post-image-gallery"
      startIndex={post.imageGalleryIndex}
      onIndexChange={handleIndexChange}
      keyboardControlsOn={keyboardControlsOn}
    >
      {images.map((image) => (
        <Image image={image} />
      ))}
    </ImageGallery>
  );
};

PostImageGallery.propTypes = {
  images: PropTypes.array.isRequired,
  isMobile: PropTypes.bool.isRequired,
  keyboardControlsOn: PropTypes.bool,
};

export default PostImageGallery;

const Image = ({ image }) => {
  return (
    <div className="post-image-gallery-image">
      <ServerImage image={image} loading="lazy" />
      <ServerImage className="is-blured" image={image} loading="lazy" />
    </div>
  );
};

Image.propTypes = {
  image: PropTypes.object.isRequired,
};

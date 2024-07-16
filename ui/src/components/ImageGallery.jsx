import React, { useState } from 'react';
import PropTypes from 'prop-types';

const ImageGallery = ({ className, children, ...props }) => {
  const numImages = Array.isArray(children) ? children.length : 1;
  console.log(`numImages: ${numImages}`);
  console.log(children);
  const nextIcon = (
    <svg viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM14.79 12.53L11.26 16.06C11.11 16.21 10.92 16.28 10.73 16.28C10.54 16.28 10.35 16.21 10.2 16.06C9.91 15.77 9.91 15.29 10.2 15L13.2 12L10.2 9C9.91 8.71 9.91 8.23 10.2 7.94C10.49 7.65 10.97 7.65 11.26 7.94L14.79 11.47C15.09 11.76 15.09 12.24 14.79 12.53Z"
        fill="#ffffff"
      />
    </svg>
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const showLeftArrow = numImages > 1 && currentImageIndex > 0;
  const showRightArrow = numImages > 1 && currentImageIndex < numImages - 1;

  return (
    <div className={'image-gallery' + (className ? ` ${className}` : '')} {...props}>
      <div
        className="image-gallery-next-btn is-button is-previous"
        onClick={() => showLeftArrow && setCurrentImageIndex((n) => n - 1)}
        style={{
          opacity: showLeftArrow ? 1 : 0,
        }}
      >
        {nextIcon}
      </div>
      <div
        className="image-gallery-next-btn is-button"
        onClick={() => showRightArrow && setCurrentImageIndex((n) => n + 1)}
        style={{
          opacity: showRightArrow ? 1 : 0,
        }}
      >
        {nextIcon}
      </div>
      <div className="image-gallery-image flex flex-center">
        {Array.isArray(children) ? children[currentImageIndex] : children}
      </div>
    </div>
  );
};

ImageGallery.propTypes = {
  className: PropTypes.string,
  children: PropTypes.arrayOf(PropTypes.element),
};

export default ImageGallery;

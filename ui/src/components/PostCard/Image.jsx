import React, { useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getImageContainSize } from '../../helper';
import Link from '../../components/Link';
import CitraImage from '../CitraImage';

const Image = ({ post, to, target, isMobile, loading = 'lazy' }) => {
  const { image } = post;

  const maxImageHeight = 520;
  const maxImageHeightMobile = () => window.innerHeight * 0.8;

  const [imageSize, setImageSize] = useState({ width: undefined, height: undefined });
  const [cardWidth, setCardWidth] = useState(0);
  const updateImageSize = () => {
    let w = document.querySelector('.post-card-body').clientWidth,
      h = isMobile ? maxImageHeightMobile() : maxImageHeight;
    let { width, height } = getImageContainSize(image.width, image.height, w, h);
    if (w - width < 35 && width / height < 1.15 && width / height > 0.85) {
      // Cover image to fit card if the image is only slightly not fitting.
      // A small part of the original image may not be visible because of this.
      width = w;
    }
    setCardWidth(w);
    setImageSize({ width, height });
  };
  useLayoutEffect(() => {
    updateImageSize();
  }, []);

  const isImageFittingCard = imageSize.width !== Math.round(cardWidth);

  return (
    <Link
      className={'post-card-img' + (isImageFittingCard ? ' is-no-fit' : '')}
      to={to}
      target={target}
    >
      <CitraImage
        image={image}
        style={{
          width: imageSize.width ?? 0,
          height: imageSize.height ?? 0,
        }}
        loading={loading}
      />
    </Link>
  );
};

Image.propTypes = {
  post: PropTypes.object.isRequired,
  to: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
  loading: PropTypes.string,
};

export default Image;

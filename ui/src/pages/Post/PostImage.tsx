import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useState } from 'react';
import ServerImage from '../../components/ServerImage';
import { getImageContainSize } from '../../helper';
import { useIsMobile } from '../../hooks';
import { Post } from '../../slices/postsSlice';

// Min image container height, in fact.
const minImageHeight = 540;

const PostImage = ({ post }: { post: Post }) => {
  const image = post.image!;

  const [imageSize, setImageSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({ width: undefined, height: undefined });
  const [windowSize, setWindowSize] = useState({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  });
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [cardWidth, setCardWidth] = useState(0);
  const isMobile = useIsMobile();
  const updateImageSize = () => {
    const w = document.querySelector('.post-card-body')?.clientWidth;
    if (w !== undefined) {
      let h = windowSize.height * (isMobile ? 1 : 0.8);
      if (h < minImageHeight) h = minImageHeight;
      const { width, height } = getImageContainSize(image.width, image.height, w, h);
      setCardWidth(w);
      setImageSize({ width, height });
    }
  };
  useLayoutEffect(() => {
    updateImageSize();
  }, [windowSize]);

  const imageNoFit = imageSize.width !== Math.round(cardWidth);

  return (
    <div className={'post-image' + (imageNoFit ? ' is-no-fit' : '')}>
      <ServerImage
        image={image}
        alt={image.altText || ''}
        sizes="(min-height: 1280px) 840px, 94vw"
        style={{
          width: imageSize.width ?? 0,
          height: imageSize.height ?? 0,
        }}
        loading="lazy"
      />
    </div>
  );
};

PostImage.propTypes = {
  post: PropTypes.object.isRequired,
};

export default PostImage;

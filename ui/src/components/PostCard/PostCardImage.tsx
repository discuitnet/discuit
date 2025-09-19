import clsx from 'clsx';
import { useCallback, useLayoutEffect, useState } from 'react';
import { getImageContainSize } from '../../helper';
import { Image } from '../../serverTypes';
import ServerImage from '../ServerImage';

export interface ImageProps {
  image: Image;
  isMobile: boolean;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
}

const PostCardImage = ({ image, isMobile, loading = 'lazy' }: ImageProps) => {
  const maxImageHeight = 520;
  const maxImageHeightMobile = () => window.innerHeight * 0.8;

  const [imageSize, setImageSize] = useState<{ width?: number; height?: number }>({
    width: undefined,
    height: undefined,
  });
  const [cardWidth, setCardWidth] = useState(0);
  const updateImageSize = useCallback(() => {
    const w = document.querySelector('.post-card-body')?.clientWidth as number;
    const h = isMobile ? maxImageHeightMobile() : maxImageHeight;
    const { width, height } = getImageContainSize(image.width, image.height, w, h);
    setCardWidth(w);
    setImageSize({ width, height });
  }, [image.height, image.width, isMobile]);
  useLayoutEffect(() => {
    updateImageSize();
  }, [updateImageSize]);

  const isImageFittingCard = imageSize.width !== Math.round(cardWidth);

  return (
    <div className={clsx('post-image', isImageFittingCard && 'is-no-fit')}>
      <ServerImage
        image={image}
        style={{
          width: imageSize.width ?? 0,
          height: imageSize.height ?? 0,
        }}
        loading={loading}
      />
    </div>
  );
};

export default PostCardImage;

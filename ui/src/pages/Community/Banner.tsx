import clsx from 'clsx';
import Image, { ImageProps } from '../../components/Image';
import { selectImageCopyURL } from '../../helper';
import { Community } from '../../serverTypes';

export interface BannerProps extends ImageProps {
  community: Community;
  className?: string;
  editable?: boolean;
}

const Banner = ({ community, className, editable, ...rest }: BannerProps) => {
  let src = '';
  let alt = `${community.name}'s banner`;

  if (community.bannerImage) {
    src = selectImageCopyURL('small', community.bannerImage);
    if (community.bannerImage.altText) {
      alt = community.bannerImage.altText;
    }
  }

  const editableCls = editable ? ' banner-editable' : '';

  return (
    <Image
      src={src}
      alt={alt}
      backgroundColor={community.bannerImage ? community.bannerImage.averageColor : '#eee'}
      className={clsx(editableCls, className)}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      {...rest}
      isFullSize
    />
  );
};

export default Banner;

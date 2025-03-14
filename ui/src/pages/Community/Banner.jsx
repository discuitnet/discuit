import PropTypes from 'prop-types';
import Image from '../../components/Image';
import { selectImageCopyURL } from '../../helper';

const Banner = ({ community, ...rest }) => {
  let src = '';
  if (community.bannerImage) {
    src = selectImageCopyURL('small', community.bannerImage);
  }

  return (
    <Image
      src={src}
      alt={`${community.name}'s banner`}
      backgroundColor={community.bannerImage ? community.bannerImage.averageColor : '#eee'}
      {...rest}
      isFullSize
    />
  );
};

Banner.propTypes = {
  community: PropTypes.object.isRequired,
};

export default Banner;

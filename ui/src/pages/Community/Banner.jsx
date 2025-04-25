import PropTypes from 'prop-types';
import Image from '../../components/Image';
import { selectImageCopyURL } from '../../helper';

const Banner = ({ community, className, editable, onEdit, ...rest }) => {
  let src = '';
  let alt = `${community.name}'s banner`;

  if (community.bannerImage) {
    src = selectImageCopyURL('small', community.bannerImage);
    if (community.bannerImage.altText) {
      alt = community.bannerImage.altText;
    }
  }

  const editableCls = editable ? ' banner-editable' : '';

  const handleClick = () => {
    if (editable && onEdit) {
      onEdit();
    }
  };

  return (
    <Image
      src={src}
      alt={alt}
      backgroundColor={community.bannerImage ? community.bannerImage.averageColor : '#eee'}
      className={editableCls + (className ? ` ${className}` : '')}
      onClick={handleClick}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      {...rest}
      isFullSize
      showCaption={false}
    />
  );
};

Banner.propTypes = {
  community: PropTypes.object.isRequired,
  className: PropTypes.string,
  editable: PropTypes.bool,
  onEdit: PropTypes.func,
};

export default Banner;

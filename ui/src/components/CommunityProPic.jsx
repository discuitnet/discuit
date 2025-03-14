import PropTypes from 'prop-types';
import { selectImageCopyURL } from '../helper';
import { useImageLoaded } from '../hooks';

const CommunityProPic = ({ className, name, proPic, size = 'small', ...rest }) => {
  const defaultFavicon = '/favicon-gray.png';
  let src = defaultFavicon;
  let averageColor = '#3d3d3d';
  if (proPic) {
    averageColor = proPic.averageColor;
    src = proPic.url;
    switch (size) {
      case 'small':
        src = selectImageCopyURL('tiny', proPic);
        break;
      case 'standard':
        src = selectImageCopyURL('small', proPic);
        break;
      case 'large':
        src = selectImageCopyURL('medium', proPic);
        break;
    }
  }

  const [loaded, handleLoad] = useImageLoaded();

  return (
    <div
      className={'profile-picture comm-propic' + (className ? ` ${className}` : '')}
      style={{ backgroundColor: averageColor, backgroundImage: loaded ? `url('${src}')` : 'none' }}
      {...rest}
    >
      <img alt={`${name}'s profile`} src={src} onLoad={handleLoad} />
    </div>
  );
};

CommunityProPic.propTypes = {
  className: PropTypes.string,
  name: PropTypes.string.isRequired,
  proPic: PropTypes.object,
  size: PropTypes.oneOf(['small', 'standard', 'large']),
};

export default CommunityProPic;

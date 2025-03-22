import { selectImageCopyURL } from '../helper';
import { useImageLoaded } from '../hooks';
import { Image } from '../serverTypes';

const CommunityProPic = ({
  className,
  name,
  proPic,
  size = 'small',
  ...rest
}: {
  className?: string;
  name: string;
  proPic: Image | null;
  size: 'small' | 'standard' | 'large';
}) => {
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

  const [loaded, handleLoad] = useImageLoaded(src);

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

export default CommunityProPic;

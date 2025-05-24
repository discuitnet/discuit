import { selectImageCopyURL } from '../helper';
import { useImageLoaded } from '../hooks';
import { Image } from '../serverTypes';
import { SVGEdit } from '../SVGs';

const CommunityProPic = ({
  className,
  name,
  proPic,
  size = 'small',
  editable = false,
  onEdit,
  ...rest
}: {
  className?: string;
  name: string;
  proPic: Image | null;
  size?: 'small' | 'standard' | 'large';
  editable?: boolean;
  onEdit?: () => void;
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

  const altText = proPic?.altText || `${name}'s profile`;
  const editableCls = editable ? ' comm-propic-editable' : '';

  const handleClick = () => {
    if (editable && onEdit) {
      onEdit();
    }
  };

  return (
    <div
      className={'profile-picture comm-propic' + (className ? ` ${className}` : '') + editableCls}
      style={{ backgroundColor: averageColor, backgroundImage: loaded ? `url('${src}')` : 'none' }}
      onClick={handleClick}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      {...rest}
    >
      <img alt={altText} src={src} onLoad={handleLoad} />
      {editable && (
        <div className="propic-edit-icon">
          <SVGEdit />
        </div>
      )}
    </div>
  );
};

export default CommunityProPic;

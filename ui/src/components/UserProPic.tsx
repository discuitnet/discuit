import clsx from 'clsx';
import PropTypes from 'prop-types';
import { selectImageCopyURL } from '../helper';
import { useImageLoaded } from '../hooks';
import { Image } from '../serverTypes';
import { SVGEdit } from '../SVGs';
import Link from './Link';

export interface ProfilePictureProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  proPic?: Image;
  size?: 'small' | 'standard' | 'large';
}

const ProfilePicture = ({ name, proPic, size = 'small', ...rest }: ProfilePictureProps) => {
  let src;
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

  const altText = proPic?.altText || `${name}'s profile`;

  return (
    <div
      className="profile-picture"
      style={{ backgroundColor: averageColor, backgroundImage: loaded ? `url('${src}')` : 'none' }}
      {...rest}
    >
      <img alt={altText} src={src} onLoad={handleLoad} />
    </div>
  );
};

ProfilePicture.propTypes = {
  name: PropTypes.string.isRequired,
  proPic: PropTypes.object,
  size: PropTypes.string,
};

export interface DefaultProfilePictureProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
}

const DefaultProfilePicture = ({ name, ...rest }: DefaultProfilePictureProps) => {
  const letter = name[0].toUpperCase();
  const color = (letter: string) => {
    const n = letter.charCodeAt(0) % 8;
    switch (n) {
      case 0:
        return '#e55454';
      case 1:
        return '#158686';
      case 2:
        return '#5454e5';
      case 3:
        return '#9d4040';
      case 4:
        return '#b854e5';
      case 5:
        return '#000000';
      case 6:
        return '#d0af4e';
      case 7:
        return '#3da5ce';
    }
  };
  return (
    <div
      className="profile-picture is-default"
      style={{ backgroundColor: color(letter) }}
      {...rest}
    >
      <svg
        viewBox="-50 -50 100 100"
        version="1.1"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text fill="currentColor" dy="0.35em" textAnchor="middle" fontSize="40px">
          {letter}
        </text>
      </svg>
    </div>
  );
};

DefaultProfilePicture.propTypes = {
  name: PropTypes.string.isRequired,
};

export interface UserProPicProps extends React.HTMLAttributes<HTMLDivElement> {
  username: string;
  proPic: Image | null;
  size?: ProfilePictureProps['size'];
  editable?: boolean;
  onEdit?: () => void; //todo
}

const UserProPic = ({
  className = '',
  username,
  proPic,
  size = 'small',
  editable = false,
  onEdit,
  ...rest
}: UserProPicProps) => {
  const handleClick = () => {
    if (editable && onEdit) {
      onEdit();
    }
  };
  return (
    <div
      className={clsx('user-propic', className, editable && 'user-propic-editable')}
      onClick={handleClick}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      {...rest}
    >
      {proPic ? (
        <ProfilePicture name={username} proPic={proPic} size={size} />
      ) : (
        <DefaultProfilePicture name={username} />
      )}
      {editable && (
        <div className="propic-edit-icon">
          <SVGEdit />
        </div>
      )}
    </div>
  );
};

export default UserProPic;

export const GhostUserProPic = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={clsx('user-propic', className)} {...rest}>
      <div className="profile-picture is-ghost" style={{ backgroundColor: 'gray', opacity: '0.3' }}>
        <svg
          viewBox="-50 -50 100 100"
          version="1.1"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        ></svg>
      </div>
    </div>
  );
};

export interface UserLinkProps {
  className?: string;
  username: string;
  proPic: Image | null;
  proPicGhost?: boolean;
  isSupporter?: boolean;
  showProPic?: boolean;
  noLink?: boolean;
  noAtSign?: boolean;
}

export const UserLink = ({
  className,
  username,
  proPic,
  proPicGhost = false,
  isSupporter = false,
  showProPic = true,
  noLink = false,
  noAtSign = false,
}: UserLinkProps) => {
  const El = noLink ? 'div' : Link;
  const name = showProPic || noAtSign ? username : `@${username}`;
  const supporterCls = isSupporter ? ' is-supporter' : '';
  const cls = 'user-link' + (className ? ` ${className}` : '') + supporterCls;
  return (
    <El className={cls} to={`/@${username}`}>
      {showProPic && !proPicGhost && <UserProPic username={username} proPic={proPic} />}
      {showProPic && proPicGhost && <GhostUserProPic />}
      <div className={'user-link-name' + supporterCls}>{name}</div>
    </El>
  );
};

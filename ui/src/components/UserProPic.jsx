import PropTypes from 'prop-types';
import { selectImageCopyURL } from '../helper';
import { useImageLoaded } from '../hooks';
import { SVGEdit } from '../SVGs';
import Link from './Link';

const ProfilePicture = ({ name, proPic, size = 'small', ...rest }) => {
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

const DefaultProfilePicture = ({ name, ...rest }) => {
  const letter = name[0].toUpperCase();
  const color = (letter) => {
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

const UserProPic = ({
  className = '',
  username,
  proPic,
  size = 'small',
  editable = false,
  onEdit,
  ...rest
}) => {
  const editableCls = editable ? ' user-propic-editable' : '';

  const handleClick = () => {
    if (editable && onEdit) {
      onEdit();
    }
  };

  return (
    <div
      className={'user-propic' + (className ? ` ${className}` : '') + editableCls}
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

UserProPic.propTypes = {
  className: PropTypes.string,
  username: PropTypes.string.isRequired,
  proPic: PropTypes.object,
  size: PropTypes.oneOf(['small', 'standard', 'large']),
  editable: PropTypes.bool,
  onEdit: PropTypes.func,
};

export default UserProPic;

export const GhostUserProPic = ({ className, ...rest }) => {
  return (
    <div className={'user-propic' + (className ? ` ${className}` : '')} {...rest}>
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

GhostUserProPic.propTypes = {
  className: PropTypes.string,
};

export const UserLink = ({
  className,
  username,
  proPic = null,
  proPicGhost = false,
  isSupporter = false,
  showProPic = true,
  noLink = false,
  noAtSign = false,
  ...rest
}) => {
  const El = noLink ? 'div' : Link;
  const name = showProPic || noAtSign ? username : `@${username}`;
  const supporterCls = isSupporter ? ' is-supporter' : '';
  const cls = 'user-link' + (className ? ` ${className}` : '') + supporterCls;
  return (
    <El className={cls} {...rest} to={`/@${username}`}>
      {showProPic && !proPicGhost && <UserProPic username={username} proPic={proPic} />}
      {showProPic && proPicGhost && <GhostUserProPic />}
      <div className={'user-link-name' + supporterCls}>{name}</div>
    </El>
  );
};

UserLink.propTypes = {
  className: PropTypes.string,
  username: PropTypes.string.isRequired,
  proPic: PropTypes.object,
  proPicGhost: PropTypes.bool,
  isSupporter: PropTypes.bool,
  showProPic: PropTypes.bool,
  noLink: PropTypes.bool,
  noAtSign: PropTypes.bool,
};

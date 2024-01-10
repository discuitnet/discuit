import React from 'react';
import PropTypes from 'prop-types';
import { useImageLoaded } from '../hooks';
import { selectImageCopyURL } from '../helper';
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

  return (
    <div
      className="profile-picture"
      style={{ backgroundColor: averageColor, backgroundImage: loaded ? `url('${src}')` : 'none' }}
      {...rest}
    >
      <img alt={`${name}'s profile`} src={src} onLoad={handleLoad} />
    </div>
  );
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

const UserProPic = ({ className, username, proPic, size = 'small', ...rest }) => {
  return (
    <div className={'user-propic' + (className ? ` ${className}` : '')}>
      {proPic ? (
        <ProfilePicture name={username} proPic={proPic} size={size} {...rest} />
      ) : (
        <DefaultProfilePicture name={username} {...rest} />
      )}
    </div>
  );
};

UserProPic.propTypes = {
  className: PropTypes.string,
  username: PropTypes.string.isRequired,
  proPic: PropTypes.object,
  size: PropTypes.oneOf(['small', 'standard', 'large']),
};

export default UserProPic;

export const DeletedUserProPic = ({ className, ...rest }) => {
  return (
    <div className="user-propic" {...rest}>
      <div
        className="profile-picture user-deleted-propic"
        style={{ backgroundColor: 'gray', opacity: '0.3' }}
      >
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

export const UserLink = ({
  className,
  username,
  proPic = null,
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
      {showProPic && <UserProPic name={username} proPic={proPic} />}
      <div className={'user-link-name' + supporterCls}>{name}</div>
    </El>
  );
};

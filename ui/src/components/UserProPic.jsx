import React from 'react';
import PropTypes from 'prop-types';
import { useImageLoaded } from '../hooks';
import { selectImageCopyURL } from '../helper';

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
        return 'tomato';
      case 1:
        return 'darkcyan';
      case 2:
        return 'blue';
      case 3:
        return 'red';
      case 4:
        return 'gray';
      case 5:
        return 'black';
      case 6:
        return 'yellow';
      case 7:
        return 'bisque';
    }
  };
  return (
    <div className="user-default-propic" style={{ backgroundColor: color(letter) }} {...rest}>
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

export const UserLink = ({ className, username, proPic = null, showProPic = true, ...rest }) => {
  return (
    <div className={'user-link' + (className ? ` ${className}` : '')} {...rest}>
      {showProPic && <UserProPic name={username} proPic={proPic} />}
      <div className="user-link-name">@{username}</div>
    </div>
  );
};

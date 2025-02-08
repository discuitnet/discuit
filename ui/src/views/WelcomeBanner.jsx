import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { createCommunityModalOpened, signupModalOpened } from '../slices/mainSlice';

const WelcomeBanner = ({ className, children, hideIfMember = false, ...props }) => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const usersCount = useSelector((state) => state.main.noUsers);

  if (hideIfMember && loggedIn) {
    return null;
  }

  const canCreateForum = loggedIn && (user.isAdmin || !import.meta.env.VITE_DISABLEFORUMCREATION);

  return (
    <div
      className={
        'card card-sub card-padding home-welcome' +
        (!loggedIn ? ' is-guest' : '') +
        (className ? ` ${className}` : '')
      }
      {...props}
    >
      <div className="home-welcome-text">
        <div className="home-welcome-join">Join the discussion 241321</div>
        <div className="home-welcome-subtext">
          Discuit is a place where <span>{usersCount}</span> people get together to find cool stuff
          and discuss things.
        </div>
      </div>
      <div className="home-welcome-buttons">
        {loggedIn && (
          <Link to="/new" className={'button' + (loggedIn ? ' button-main' : '')}>
            Create post
          </Link>
        )}
        {canCreateForum && (
          <>
            <button
              onClick={() => dispatch(createCommunityModalOpened())}
              className={'button' + (loggedIn ? ' button-main' : '')}
            >
              Create community
            </button>
          </>
        )}
        <>{children}</>
        {!loggedIn && (
          <button onClick={() => dispatch(signupModalOpened())}>Create new account</button>
        )}
      </div>
    </div>
  );
};

WelcomeBanner.propTypes = {
  className: PropTypes.string,
  children: PropTypes.element,
  hideIfMember: PropTypes.bool,
};

export default WelcomeBanner;

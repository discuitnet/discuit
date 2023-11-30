import React from 'react';
import PropTypes from 'prop-types';
import { useHistory, useLocation } from 'react-router';

function locationToString(location) {
  return `${location.pathname ?? ''}${location.search ?? ''}${location.hash ?? ''}`;
}

const Link = ({ to, replace = false, children, onClick, target, ...props }) => {
  const history = useHistory();
  const location = useLocation();

  const handleClick = (event) => {
    if (onClick) onClick();
    if ((target ?? '_self') !== '_self') return;
    event.preventDefault();
    if (to === locationToString(location)) {
      window.scrollTo(0, 0);
      return;
    }
    if (replace) {
      history.replace(to);
    } else {
      history.push(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} target={target} {...props}>
      {children}
    </a>
  );
};

Link.propTypes = {
  to: PropTypes.string.isRequired,
  replace: PropTypes.bool,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  target: PropTypes.string,
};

export default Link;

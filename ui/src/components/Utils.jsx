import PropTypes from 'prop-types';
import React from 'react';
import Link from '../components/Link';

const LinkOrDiv = ({
  isLink = true,
  useReactRouter = false,
  href,
  target = '_blank',
  rel = 'nofollow noreferrer',
  children,
  ...props
}) => {
  if (isLink) {
    if (useReactRouter) {
      return (
        <Link {...props} to={href} target={target} rel={rel}>
          {children}
        </Link>
      );
    }

    return (
      <a href={href} target={target} rel={rel} {...props}>
        {children}
      </a>
    );
  }

  return <div {...props}>{children}</div>;
};

LinkOrDiv.propTypes = {
  isLink: PropTypes.bool,
  useReactRouter: PropTypes.bool,
  children: PropTypes.node,
  href: PropTypes.string.isRequired,
  target: PropTypes.string,
  rel: PropTypes.string,
};

const ExternalLink = ({ href, children, ...props }) => {
  return (
    <a href={href} target="_blank" rel="nofollow noreferrer" {...props}>
      {children}
    </a>
  );
};

ExternalLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export { ExternalLink, LinkOrDiv };

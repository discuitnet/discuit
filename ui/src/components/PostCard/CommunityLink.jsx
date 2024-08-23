import PropTypes from 'prop-types';
import React from 'react';
import Link from '../../components/Link';
import CommunityProPic from '../CommunityProPic';

const CommunityLink = ({ className, target = '_self', name, proPic, noLink = false }) => {
  const props = {
    className: 'community-link' + (className ? ` ${className}` : ''),
  };
  if (!noLink) {
    props.target = target;
    props.to = `/${name}`;
  }
  const children = [
    <CommunityProPic proPic={proPic} name={name} key="1" />,
    <span key="2">{name}</span>,
  ];
  return React.createElement(noLink ? 'div' : Link, props, ...children);
};

CommunityLink.propTypes = {
  className: PropTypes.string,
  target: PropTypes.string,
  proPic: PropTypes.object,
  name: PropTypes.string.isRequired,
  noLink: PropTypes.bool,
};

export default CommunityLink;

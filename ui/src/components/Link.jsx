import PropTypes from 'prop-types';
import { useLinkClick } from '../hooks';

const Link = ({ to, replace = false, children, onClick, target, ...props }) => {
  const handleClick = useLinkClick(to, onClick, target, replace);
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

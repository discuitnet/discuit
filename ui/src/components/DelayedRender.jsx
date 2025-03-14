import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

const DelayedRender = ({ delay = 0, children }) => {
  const [show, setShow] = useState(delay === 0);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (show) {
    return children;
  }

  return null;
};

DelayedRender.propTypes = {
  delay: PropTypes.number,
  children: PropTypes.element.isRequired,
};

export default DelayedRender;

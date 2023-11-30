import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { timeAgo } from '../helper';

const TimeAgo = ({ time, inline = true, prefix = '', suffix = ' ago', short = false, ...rest }) => {
  const t = time instanceof Date ? time : new Date(time);

  const [, setCounter] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((c) => c + 1);
    }, 60000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return React.createElement(
    inline ? 'span' : 'div',
    {
      title: t.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
      ...rest,
    },
    `${prefix}${timeAgo(t, suffix, true, short)}`
  );
};

TimeAgo.propTypes = {
  time: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  inline: PropTypes.bool,
  short: PropTypes.bool,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
};

export default TimeAgo;

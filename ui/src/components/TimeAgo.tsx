import React, { useEffect, useState } from 'react';
import { timeAgo } from '../helper';

export interface TimeAgoProps extends React.HTMLAttributes<HTMLElement> {
  time: string | Date;
  inline?: boolean;
  prefix?: string;
  suffix?: string;
  short?: boolean;
}

const TimeAgo = ({
  time,
  inline = true,
  prefix = '',
  suffix = ' ago',
  short = false,
  ...rest
}: TimeAgoProps) => {
  const _time = time instanceof Date ? time : new Date(time);

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
      title: _time.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
      ...rest,
    },
    `${prefix}${timeAgo(_time, suffix, true, short)}`
  );
};

export default TimeAgo;

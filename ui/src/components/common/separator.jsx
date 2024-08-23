import React from 'react';

export const Separator = ({ style }) => {
  return (
    <hr
      style={{
        backgroundColor: 'var(--color-gray)',
        opacity: 0.3,
        ...style,
      }}
    />
  );
};

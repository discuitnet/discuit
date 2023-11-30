import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ShowMoreBox = ({ maxHeight = '300px', children, showButton = false, ...props }) => {
  const [overflowing, setOverflowing] = useState(false);
  const [wasOverflowing, setWasOverflowing] = useState(false);
  useEffect(() => {
    setWasOverflowing(false);
  }, [children]);
  const divRef = useCallback((node) => {
    if (node !== null) {
      const overflowing = node.scrollHeight > node.clientHeight;
      setOverflowing(overflowing);
      if (overflowing && !wasOverflowing) setWasOverflowing(true);
    }
  });
  const [showAll, setShowAll] = useState(false);
  return (
    <div
      className={
        'showmorebox' + (overflowing ? ' is-overflowing' : '') + (showAll ? ' is-show-all' : '')
      }
    >
      <div
        className="showmorebox-body"
        style={{ maxHeight: showAll ? 'none' : maxHeight }}
        ref={divRef}
        {...props}
      >
        {children}
      </div>
      {showButton && wasOverflowing && (
        <div className="showmorebox-button">
          <button className="button-clear" onClick={() => setShowAll((x) => !x)}>
            {showAll ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
};

ShowMoreBox.propTypes = {
  maxHeight: PropTypes.string,
  children: PropTypes.node.isRequired,
  showButton: PropTypes.bool,
};

export default ShowMoreBox;

import { useCallback, useEffect, useState } from 'react';

export interface ShowMoreBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  children?: React.ReactNode;
  childrenHash?: string;
  showButton?: boolean;
}

const ShowMoreBox = ({
  maxHeight = '300px',
  children,
  childrenHash = '',
  showButton = false,
  ...props
}: ShowMoreBoxProps) => {
  const [overflowing, setOverflowing] = useState(false);
  const [hasOverflown, setHasOverflown] = useState(false);
  useEffect(() => {
    setHasOverflown(false);
  }, [childrenHash]);
  const divRef: React.RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      if (node !== null) {
        const overflowing = node.scrollHeight > node.clientHeight;
        setOverflowing(overflowing);
        if (overflowing && !hasOverflown) setHasOverflown(true);
      }
    },
    [hasOverflown]
  );
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
      {showButton && hasOverflown && (
        <div className="showmorebox-button">
          <button className="button-clear" onClick={() => setShowAll((x) => !x)}>
            {showAll ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShowMoreBox;

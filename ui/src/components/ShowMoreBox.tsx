import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

export interface ShowMoreBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  children?: React.ReactNode;

  /**
   * A string that uniquely identifies the children that's passed to this
   * component. It could be a hash, a key, or something else. This value is used
   * to identify changes to the children, so that the height of the box can be
   * adjusted.
   *
   */
  childrenHash: string;
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

  const divRef = useRef<HTMLDivElement>(null);
  const [buttonClicks, setButtonClicks] = useState(0);
  useEffect(() => {
    if (divRef.current) {
      const overflowing = divRef.current.scrollHeight > divRef.current.clientHeight;
      setOverflowing(overflowing);
      if (overflowing && !hasOverflown) setHasOverflown(true);
    }
  }, [divRef, buttonClicks, hasOverflown]);

  const handleButtonClick = () => {
    setShowAll((b) => !b);
    setButtonClicks((n) => n + 1);
  };

  const [showAll, setShowAll] = useState(false);

  return (
    <div className={clsx('showmorebox', overflowing && 'is-overflowing', showAll && 'is-show-all')}>
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
          <button className="button-clear" onClick={handleButtonClick}>
            {showAll ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShowMoreBox;

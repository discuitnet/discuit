import React, { useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

export interface FeedItemProps {
  itemKey: string;
  index: number;
  children: React.ReactNode;
  height: number | null;
  onHeightChange: (height: number) => void;
  keepRenderedHtml?: boolean;
  initiallyInView: boolean;
  onViewChange: (itemKey: string, inView: boolean) => void;
}

const FeedItem = ({
  itemKey,
  index,
  children,
  height,
  onHeightChange,
  keepRenderedHtml = false,
  initiallyInView,
  onViewChange,
}: FeedItemProps) => {
  const [ref, inView] = useInView({
    rootMargin: '200px 0px',
    threshold: 0,
    initialInView: initiallyInView || index < 6,
  });

  const [renderedOnce, setRenderedOnce] = useState(inView);
  useEffect(() => {
    if (inView) setRenderedOnce(true);
    onViewChange(itemKey, inView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const innerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null && inView) {
        const { height: h } = (node as Element).getBoundingClientRect();
        if (height !== h) onHeightChange(h);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  console.log('Rendering feed item');

  return (
    <div className="feed-item" ref={ref} style={{ minHeight: height ?? '0px' }}>
      {(inView || (keepRenderedHtml && renderedOnce)) && (
        <div className="feed-item-item" ref={innerRef}>
          {children}
        </div>
      )}
    </div>
  );
};

/*
FeedItem.propTypes = {
  itemKey: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  height: PropTypes.number,
  onHeightChange: PropTypes.func.isRequired,
  keepRenderedHtml: PropTypes.bool,
  initiallyInView: PropTypes.bool.isRequired,
  onViewChange: PropTypes.func.isRequired,
};
*/

export default FeedItem;

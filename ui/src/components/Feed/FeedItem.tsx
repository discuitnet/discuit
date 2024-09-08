/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
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
    if (inView) {
      setRenderedOnce(true);
    }
    onViewChange(itemKey, inView);
  }, [inView]);

  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inView && innerRef.current) {
      const { height: h } = innerRef.current.getBoundingClientRect();
      if (height !== h) onHeightChange(h);
    }
  }, [inView, innerRef.current]);

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

export default FeedItem;

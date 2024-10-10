/* eslint-disable react-hooks/exhaustive-deps */
import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const FeedItem = ({
  itemKey,
  index,
  children,
  height,
  onHeightChange,
  keepRenderedHtml = false,
  initiallyInView,
  onViewChange,
}) => {
  const [ref, inView] = useInView({
    rootMargin: '200px 0px',
    threshold: 0,
    initialInView: initiallyInView || index < 6,
  });

  const [renderedOnce, setRenderedOnce] = useState(inView);
  useEffect(() => {
    if (inView) setRenderedOnce(true);
    onViewChange(itemKey, inView);
  }, [inView]);

  const innerRef = useCallback((node) => {
    if (node !== null && inView) {
      const { height: h } = node.getBoundingClientRect();
      if (height !== h) onHeightChange(h);
    }
  });

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

FeedItem.propTypes = {
  itemKey: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  children: PropTypes.node,
  height: PropTypes.number,
  onHeightChange: PropTypes.func.isRequired,
  keepRenderedHtml: PropTypes.bool,
  initiallyInView: PropTypes.bool.isRequired,
  onViewChange: PropTypes.func.isRequired,
};

export default FeedItem;

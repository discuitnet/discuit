import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useWindowWidth } from '../../hooks';
import { FeedItem } from '../../slices/feedsSlice';
import PostCardSkeleton from '../PostCard/PostCardSkeleton';
import Spinner from '../Spinner';
import FeedItemComponent from './FeedItem';

export interface FeedProps {
  loading: boolean;
  items: FeedItem[];
  itemsInitiallyInView: string[] | null;
  onSaveVisibleItems: (items: string[]) => void;
  hasMore: boolean;
  onNext: () => void;
  onRenderItem: (item: FeedItem, index: number) => React.ReactNode;
  onItemHeightChange: (height: number, item: FeedItem) => void;
  emptyItemsText: string;
  banner: React.ReactNode;
  // onRemoveFromList?: () => void;
}

const Feed = ({
  loading,
  items,
  itemsInitiallyInView = [],
  onSaveVisibleItems,
  hasMore,
  onNext,
  onRenderItem,
  onItemHeightChange,
  emptyItemsText = 'Nothing to show',
  banner,
  // onRemoveFromList,
}: FeedProps) => {
  const windowHeight = document.documentElement.clientHeight;
  const rootMargin = Math.round(Math.max(windowHeight * 0.35, 200));
  const [spinnerRef, inView] = useInView({
    rootMargin: `${rootMargin}px 0px`,
    threshold: 0,
  });
  useEffect(() => {
    if (!loading && hasMore && inView) {
      onNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, inView]);
  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= 1280;

  const itemsInView = useRef<string[]>([]);
  useEffect(() => {
    if (!loading) {
      return () => {
        if (onSaveVisibleItems) onSaveVisibleItems([...itemsInView.current]);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  const handleItemViewChange = (itemKey: string, inView: boolean) => {
    let list = itemsInView.current;
    if (inView) {
      if (!list.includes(itemKey)) list.push(itemKey);
    } else {
      list = list.filter((k) => k !== itemKey);
    }
    itemsInView.current = list;
  };

  const onRenderItems = () => {
    const nodes: React.ReactNode[] = [];
    items.forEach((item, index) => {
      nodes.push(
        <FeedItemComponent
          index={index}
          itemKey={item.key}
          key={item.key}
          height={item.height}
          onHeightChange={(height) => onItemHeightChange(height, item)}
          keepRenderedHtml={isDesktop}
          onViewChange={handleItemViewChange}
          initiallyInView={(itemsInitiallyInView || []).includes(item.key)}
        >
          {onRenderItem(item, index)}
        </FeedItemComponent>
      );
      if (banner && index === 1) {
        nodes.push(
          <div key="banner" className="feed-banner is-m">
            {banner}
          </div>
        );
      }
    });
    return nodes;
  };

  if (loading) {
    return (
      <div className="feed">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  return (
    <div className="feed">
      {onRenderItems()}
      {hasMore && (
        <div className="feed-spinner" ref={spinnerRef}>
          <Spinner />
        </div>
      )}
      {items.length > 0 && !hasMore && <div className="feed-no-more">No more posts</div>}
      {items.length === 0 && <div className="card card-padding feed-none">{emptyItemsText}</div>}
    </div>
  );
};

/*
Feed.propTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  itemsInitiallyInView: PropTypes.array,
  onSaveVisibleItems: PropTypes.func,
  hasMore: PropTypes.bool.isRequired,
  onNext: PropTypes.func.isRequired,
  isMoreItemsLoading: PropTypes.bool.isRequired,
  onRenderItem: PropTypes.func.isRequired,
  onItemHeightChange: PropTypes.func.isRequired,
  emptyItemsText: PropTypes.string,
  banner: PropTypes.element,
  onRemoveFromList: PropTypes.func,
};
*/

export default Feed;

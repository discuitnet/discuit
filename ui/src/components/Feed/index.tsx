import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useDispatch, useSelector } from 'react-redux';
import { useWindowWidth } from '../../hooks';
import {
  feedInViewItemsUpdated,
  FeedItem,
  feedItemHeightChanged,
  feedUpdated,
  selectFeed,
  selectFeedInViewItems,
} from '../../slices/feedsSlice';
import { snackAlertError } from '../../slices/mainSlice';
import Button from '../Button';
import Spinner from '../Spinner';
import FeedItemComponent from './FeedItem';
import FeedSkeleton from './FeedSkeleton';

export interface FeedProps<FeedItemType> {
  className?: string;
  compact?: boolean;
  feedId: string;
  onFetch: (
    next?: string | null
  ) => Promise<{ items: FeedItem<FeedItemType>[]; next: string | null } | null>;
  onRenderItem: (item: FeedItem, index: number) => React.ReactNode;
  banner?: React.ReactNode;
  noMoreItemsText?: string;
  emptyItemsText?: string;
  skeletons?: React.ReactNode;
  infiniteScrollingDisabled?: boolean;
}

function Feed<FeedItemType>({
  className,
  compact = false,
  feedId,
  onFetch,
  onRenderItem,
  banner,
  noMoreItemsText = 'No more posts',
  emptyItemsText = 'Nothing to show',
  skeletons,
  infiniteScrollingDisabled = false,
}: FeedProps<FeedItemType>) {
  const windowHeight = document.documentElement.clientHeight;
  const rootMargin = Math.round(Math.max(windowHeight * 0.35, 200));
  const [spinnerRef, spinnerInView] = useInView({
    rootMargin: `${rootMargin}px 0px`,
    threshold: 0,
  });

  const feed = useSelector(selectFeed(feedId));
  const loading = feed ? feed.loading : true;
  const hasMore = feed ? Boolean(feed.next) : false;
  const [, /*error*/ setError] = useState<unknown>(null);

  const [fetching, setFetching] = useState(false);
  const fetchingRef = useRef(false);
  const fetchFeedAndDispatch = async (next: string | null) => {
    if (fetchingRef.current) {
      return;
    }
    try {
      setFetching(true);
      fetchingRef.current = true;
      const res = await onFetch(next);
      if (res) {
        dispatch(feedUpdated(feedId, res.items, res.next));
      } else {
        throw new Error(`onFetch (feedId: ${feedId}) returned null`);
      }
    } catch (error: unknown) {
      setError(error);
      dispatch(snackAlertError(error));
    } finally {
      fetchingRef.current = false;
      setFetching(false);
    }
  };

  useEffect(() => {
    if (loading) {
      fetchFeedAndDispatch(null);
    }
  }, [feedId, loading]);

  const handleLoadMoreClick = () => {
    if (feed && feed.next) {
      fetchFeedAndDispatch(feed.next);
    }
  };

  useEffect(() => {
    if (infiniteScrollingDisabled) {
      return;
    }
    if (!loading && hasMore && spinnerInView) {
      handleLoadMoreClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, spinnerInView]);

  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= 1280;

  const itemsInitiallyInView = useSelector(selectFeedInViewItems(feedId));

  const dispatch = useDispatch();
  const itemsInView = useRef<string[]>([]);
  useEffect(() => {
    if (!loading) {
      return () => {
        dispatch(feedInViewItemsUpdated(feedId, [...itemsInView.current]));
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

  const handleItemHeightChange = (height: number, item: FeedItem) => {
    dispatch(feedItemHeightChanged(item.key, height));
  };

  const items = feed ? feed.items : [];
  const onRenderItems = () => {
    const nodes: React.ReactNode[] = [];
    items.forEach((item, index) => {
      const renderedItem = onRenderItem(item, index);
      if (renderedItem !== null) {
        nodes.push(
          <FeedItemComponent
            index={index}
            itemKey={item.key}
            key={item.key}
            height={item.height}
            onHeightChange={(height: number) => handleItemHeightChange(height, item)}
            keepRenderedHtml={isDesktop}
            onViewChange={handleItemViewChange}
            initiallyInView={(itemsInitiallyInView || []).includes(item.key)}
          >
            {renderedItem}
          </FeedItemComponent>
        );
      }
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

  const _className = clsx('feed', compact && 'is-compact', className);

  if (loading) {
    return (
      <div className={_className}>
        {skeletons ? (
          skeletons
        ) : (
          <>
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
            <FeedSkeleton compact={compact} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={_className}>
      {onRenderItems()}
      {!infiniteScrollingDisabled && hasMore && (
        <div className="feed-spinner" ref={spinnerRef}>
          <Spinner />
        </div>
      )}
      {infiniteScrollingDisabled && hasMore && (
        <div className="feed-load-more">
          <Button disabled={fetching} onClick={handleLoadMoreClick}>
            More
          </Button>
        </div>
      )}
      {items.length > 0 && !hasMore && <div className="feed-no-more">{noMoreItemsText}</div>}
      {items.length === 0 && <div className="card card-padding feed-none">{emptyItemsText}</div>}
    </div>
  );
}

export default Feed;

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
import PostCardSkeleton from '../PostCard/PostCardSkeleton';
import Spinner from '../Spinner';
import FeedItemComponent from './FeedItem';

export interface FeedProps<FeedItemType> {
  feedId: string;
  onFetch: (
    next?: string | null
  ) => Promise<{ items: FeedItem<FeedItemType>[]; next: string | null } | null>;
  onRenderItem: (item: FeedItem, index: number) => React.ReactNode;
  banner?: React.ReactNode;
  emptyItemsText?: string;
}

function Feed<FeedItemType>({
  feedId,
  onFetch,
  onRenderItem,
  banner,
  emptyItemsText = 'Nothing to show',
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

  const fetchFeedAndDispatch = async (next: string | null) => {
    try {
      const res = await onFetch(next);
      if (res) {
        dispatch(feedUpdated(feedId, res.items, res.next));
      } else {
        throw new Error(`onFetch (feedId: ${feedId}) returned null`);
      }
    } catch (error: unknown) {
      setError(error);
      dispatch(snackAlertError(error));
    }
  };

  useEffect(() => {
    if (loading) {
      fetchFeedAndDispatch(null);
    }
  }, [feedId, loading]);

  useEffect(() => {
    if (!loading && hasMore && spinnerInView) {
      if (feed && feed.next) {
        fetchFeedAndDispatch(feed.next);
      }
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
      nodes.push(
        <FeedItemComponent
          index={index}
          itemKey={item.key}
          key={item.key}
          height={item.height}
          onHeightChange={(height) => handleItemHeightChange(height, item)}
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
}

export default Feed;

import clsx from 'clsx';
import React from 'react';
import Button from './Button';

export interface SimpleFeedItem<T> {
  item: T;
  key: string;
}

function SimpleFeed<T>({
  items,
  onRenderItem,
  onRenderHead /* For table style feeds, especially. */,
  onFetchMore,
  className,
  hasMore = false,
}: {
  items: SimpleFeedItem<T>[] | null;
  onRenderItem: (item: T) => React.ReactNode;
  onRenderHead?: () => React.ReactNode;
  onFetchMore?: () => void;
  className?: string;
  hasMore?: boolean;
}) {
  const renderItems = () =>
    (items ?? []).map(({ key, item }) => (
      <React.Fragment key={key}>{onRenderItem(item)}</React.Fragment>
    ));
  return (
    <div className={clsx('simple-feed', className)}>
      {onRenderHead && onRenderHead()}
      {renderItems()}
      {hasMore && <Button onClick={() => onFetchMore && onFetchMore()}>More</Button>}
    </div>
  );
}

export default SimpleFeed;

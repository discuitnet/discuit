import clsx from 'clsx';
import React from 'react';

export interface SimpleFeedItem<T> {
  item: T;
  key: string;
}

function SimpleFeed<T>({
  items,
  onRenderItem,
  onRenderHead /* For table style feeds, especially. */,
  className,
}: {
  items: SimpleFeedItem<T>[] | null;
  onRenderItem: (item: T) => React.ReactNode;
  onRenderHead?: () => React.ReactNode;
  className?: string;
}) {
  const renderItems = () => {
    const rendered = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        rendered.push(
          <React.Fragment key={items[i].key}>{onRenderItem(items[i].item)}</React.Fragment>
        );
      }
    }
    return rendered;
  };
  return (
    <div className={clsx('simple-feed', className)}>
      {onRenderHead && onRenderHead()}
      {renderItems()}
    </div>
  );
}

export default SimpleFeed;

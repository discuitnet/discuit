export interface SimpleFeedItem<T> {
  item: T;
  key: string;
}

function SimpleFeed<T>({
  items,
  onRenderItem,
}: {
  items: SimpleFeedItem<T>[] | null;
  onRenderItem: (item: T) => React.ReactElement;
}) {
  const renderItems = () => {
    const rendered = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        rendered.push(
          <div className="simple-feed-item" key={items[i].key}>
            {onRenderItem(items[i].item)}
          </div>
        );
      }
    }
    return rendered;
  };
  return (
    <div className="simple-feed">
      <div className="simple-feed-items">{renderItems()}</div>
    </div>
  );
}

export default SimpleFeed;

const FeedSkeleton = ({ compact }: { compact: boolean }) => {
  return (
    <div className="feed-skeleton">
      <div className="skeleton">
        {compact ? (
          <>
            <div className="skeleton-bar" style={{ width: '40%', height: 16 }}></div>
            <div className="skeleton-bar" style={{ width: '100%', height: 52 }}></div>
          </>
        ) : (
          <>
            <div className="skeleton-bar" style={{ width: '40%', height: 16 }}></div>
            <div className="skeleton-bar" style={{ width: '70%', height: 32 }}></div>
            <div className="skeleton-bar" style={{ width: '100%', height: 240 }}></div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedSkeleton;

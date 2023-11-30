import React from 'react';

const PostCardSkeleton = () => {
  return (
    <div className="post-skeleton">
      <div className="skeleton">
        <div className="skeleton-bar" style={{ width: '40%', height: 16 }}></div>
        <div className="skeleton-bar" style={{ width: '70%', height: 32 }}></div>
        <div className="skeleton-bar" style={{ width: '100%', height: 240 }}></div>
      </div>
    </div>
  );
};

export default PostCardSkeleton;

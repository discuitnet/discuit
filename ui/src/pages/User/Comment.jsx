import React from 'react';
import PropTypes from 'prop-types';
import Link from '../../components/Link';
import TimeAgo from '../../components/TimeAgo';
import { kRound, stringCount } from '../../helper';
import MarkdownBody from '../../components/MarkdownBody';
import ShowMoreBox from '../../components/ShowMoreBox';
import CommunityLink from '../../components/PostCard/CommunityLink';

const Comment = ({ comment }) => {
  return (
    <div className="comment">
      <div className="comment-head">
        <Link className="comment-username" to={`/@${comment.username}`}>
          {`@${comment.username}`}
        </Link>
        <span>commented on</span>
        <Link
          className="comment-post-title"
          to={`/${comment.communityName}/post/${comment.postPublicId}`}
        >
          {comment.postTitle}
        </Link>
        <span>in</span>
        {/*<CommunityLink name={comment.communityName} />*/}
        <Link to={`/${comment.communityName}`} style={{ color: 'inherit', fontWeight: '600' }}>
          {comment.communityName}
        </Link>
        <span>
          <TimeAgo time={comment.createdAt} />.
        </span>
      </div>
      <Link
        className="comment-body"
        to={`/${comment.communityName}/post/${comment.postPublicId}/${comment.id}`}
      >
        <ShowMoreBox>
          <MarkdownBody noLinks>{comment.body}</MarkdownBody>
        </ShowMoreBox>
      </Link>
      <div className="comment-score">{`${kRound(comment.upvotes)} ${stringCount(
        comment.upvotes,
        true,
        'upvote'
      )} • ${kRound(comment.downvotes)} ${stringCount(comment.downvotes, true, 'downvote')}`}</div>
    </div>
  );
};

Comment.propTypes = {
  comment: PropTypes.object.isRequired,
};

export default Comment;

export const MemorizedComment = React.memo(Comment);

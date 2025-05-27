import React from 'react';
import Link from '../../components/Link';
import MarkdownBody from '../../components/MarkdownBody';
import ShowMoreBox from '../../components/ShowMoreBox';
import TimeAgo from '../../components/TimeAgo';
import { kRound, stringCount } from '../../helper';
import { Comment as CommentType } from '../../serverTypes';

const Comment = ({
  comment,
  onRemoveFromList,
}: {
  comment: CommentType;
  onRemoveFromList?: (commentId: string) => void;
}) => {
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
        <ShowMoreBox childrenHash={comment.body}>
          <MarkdownBody noLinks>{comment.body}</MarkdownBody>
        </ShowMoreBox>
      </Link>
      <div className="comment-footer">
        <div className="comment-score">
          {`${kRound(comment.upvotes)} ${stringCount(comment.upvotes, true, 'upvote')} • ${kRound(
            comment.downvotes
          )} ${stringCount(comment.downvotes, true, 'downvote')}`}
        </div>
        <div className="comment-remove">
          {onRemoveFromList && (
            <button className="button-clear" onClick={() => onRemoveFromList(comment.id)}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comment;

export const MemorizedComment = React.memo(Comment);

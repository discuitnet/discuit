import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mfetchjson } from '../../helper';
import { defaultCommentZIndex, moreCommentsAdded } from '../../slices/commentsSlice';
import { commentsTree, countChildrenReplies } from '../../slices/commentsTree';
import { snackAlertError } from '../../slices/mainSlice';
import { MemorizedComment } from './Comment';

const CommentSection = ({
  post,
  community,
  user,
  focusId,
  isMobile,
  isAdmin,
  isBanned,
  canVote,
  canComment,
}) => {
  const dispatch = useDispatch();

  const postId = post.publicId;
  // const comments = useSelector((state) => {
  //   const obj = state.comments.items[post.publicId];
  //   if (obj) return obj.comments;
  //   return null;
  // });
  const commentsObj = useSelector((state) => state.comments.items[postId]);
  const comments = commentsObj ? commentsObj.comments : null;

  const noRootComments = comments && comments.children ? comments.children.length : 0;

  const noChildrenReplies = comments ? countChildrenReplies(comments) : 0;
  const noMoreReplies = post.noComments - noChildrenReplies;

  const atOnce = isMobile ? 5 : 20;
  const interval = isMobile ? 250 : 100;
  const [toRender, setToRender] = useState(noRootComments < atOnce ? noRootComments : atOnce);
  const updateToRender = () => {
    setToRender((r) => {
      if (r + atOnce > noRootComments) {
        return noRootComments;
      }
      return r + atOnce;
    });
  };
  const timer = useRef(null);
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    };
  }, []);

  // const commentsNext = useSelector((state) => {
  //   const obj = state.comments.items[postId];
  //   if (obj) return obj.next;
  //   return null;
  // });
  const commentsNext = commentsObj ? commentsObj.next : null;
  const [moreCommentsLoading, setMoreCommentsLoading] = useState('pre');
  const handleMoreComments = async () => {
    try {
      setMoreCommentsLoading('loading');
      let res, rcomments;
      let next = commentsNext;
      do {
        res = await mfetchjson(`/api/posts/${post.publicId}/comments?next=${next}`);
        rcomments = [];
        const rootIds = comments.children.map((c) => c.comment.id);
        res.comments.forEach((c) => {
          if (c.depth === 0) {
            if (!rootIds.includes(c.id)) rcomments.push(c);
          } else {
            if (!rootIds.includes(c.ancestors[0])) {
              rcomments.push(c);
            }
          }
        });
        next = res.next;
      } while (rcomments.length === 0 && next !== null);
      const newtree = commentsTree(rcomments);
      const merged = {
        ...comments,
        noRepliesRendered: comments.noRepliesRendered + newtree.noRepliesRendered,
        children: [...comments.children, ...newtree.children],
      };
      dispatch(moreCommentsAdded(post.publicId, merged, next));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setMoreCommentsLoading('pre');
    }
  };

  // const zIndexTop = useSelector((state) => state.comments.items[postId].zIndexTop);
  const zIndexTop = commentsObj ? commentsObj.zIndexTop : defaultCommentZIndex;
  const renderComments = () => {
    const rendered = [];
    let _toRender = toRender;
    if (_toRender > comments.children.length) {
      _toRender = comments.children.length;
      setToRender(comments.children.length);
    }
    for (let i = 0; i < _toRender; i++) {
      const n = comments.children[i];
      rendered.push(
        <MemorizedComment
          post={post}
          user={user}
          key={n.comment.id}
          zIndex={zIndexTop - i}
          community={community}
          focusId={focusId}
          node={n}
          isMobile={isMobile}
          isAdmin={isAdmin}
          isBanned={isBanned}
          canVote={canVote}
          canComment={canComment}
        />
      );
    }
    if (noRootComments > _toRender) {
      if (noRootComments - _toRender === 1) {
        setToRender(noRootComments);
      } else {
        timer.current = setTimeout(updateToRender, interval);
      }
    }
    return rendered;
  };

  // const totalRenders = useRef(0);
  const moreCommentsText =
    moreCommentsLoading === 'loading' ? 'loading...' : `${noMoreReplies} more comments`;

  return (
    <div className="post-comments-comments">
      {/*
      <h3>Total Renders: {totalRenders.current++}</h3>
      <h3>Total Rendered Comments: {comments.noRepliesRendered}</h3>
  */}
      {comments && comments.children && renderComments()}
      {noMoreReplies > 0 && (
        <button className="button-main post-comments-more-button" onClick={handleMoreComments}>
          {moreCommentsText}
        </button>
      )}
    </div>
  );
};

CommentSection.propTypes = {
  post: PropTypes.object.isRequired,
  community: PropTypes.object.isRequired,
  user: PropTypes.object,
  focusId: PropTypes.string,
  isMobile: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isBanned: PropTypes.bool.isRequired,
  canVote: PropTypes.bool.isRequired,
  canComment: PropTypes.bool.isRequired,
};

export default CommentSection;

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mfetchjson } from '../../helper';
import { Comment as CommentType, Community, User } from '../../serverTypes';
import { CommentsState, defaultCommentZIndex, moreCommentsAdded } from '../../slices/commentsSlice';
import { commentsTree, countChildrenReplies, Node } from '../../slices/commentsTree';
import { snackAlertError } from '../../slices/mainSlice';
import { Post } from '../../slices/postsSlice';
import { RootState } from '../../store';
import { MemorizedComment } from './Comment';

export interface CommentSectionProps {
  post: Post;
  community: Community;
  user: User | null;
  focusId?: string;
  isMobile: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  canVote: boolean;
  canComment: boolean;
}

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
}: CommentSectionProps) => {
  const dispatch = useDispatch();

  const postId = post.publicId;
  // const comments = useSelector((state) => {
  //   const obj = state.comments.items[post.publicId];
  //   if (obj) return obj.comments;
  //   return null;
  // });
  const commentsObj = useSelector<RootState>(
    (state) => state.comments.items[postId]
  ) as CommentsState['items'][''];
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
  const timer: React.MutableRefObject<number | null> = useRef(null);
  useEffect(() => {
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
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
      let res;
      let rcomments: CommentType[];
      let next = commentsNext;
      do {
        res = (await mfetchjson(`/api/posts/${post.publicId}/comments?next=${next}`)) as {
          comments: CommentType[] | null;
          next: string | null;
        };
        rcomments = [];
        let rootIds: string[] = [];
        if (comments && comments.children) {
          rootIds = comments.children
            .map((node) => (node.comment ? node.comment.id : null))
            .filter((id) => id !== null);
        }
        (res.comments || []).forEach((c) => {
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
      const merged: Node = {
        ...comments!,
        noRepliesRendered: (comments ? comments.noRepliesRendered : 0) + newtree.noRepliesRendered,
        children: [
          ...(comments && comments.children ? comments.children : []),
          ...(newtree && newtree.children ? newtree.children : []),
        ],
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
    const children: Node[] = (comments && comments.children) || [];
    if (_toRender > children.length) {
      _toRender = children.length;
      setToRender(children.length);
    }
    for (let i = 0; i < _toRender; i++) {
      const node = children[i];
      rendered.push(
        <MemorizedComment
          post={post}
          user={user || null}
          key={node.comment?.id}
          zIndex={zIndexTop - i}
          community={community}
          focusId={focusId || ''}
          node={node}
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
        timer.current = window.setTimeout(updateToRender, interval);
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

export default CommentSection;

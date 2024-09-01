import { Comment } from '../serverTypes';
import { AppDispatch, UnknownAction } from '../store';
import { addComment, commentsTree, Node, searchTree } from './commentsTree';
import { commentsCountIncremented } from './postsSlice';

export interface CommentsState {
  ids: string[];
  items: {
    [postId: string]: {
      comments: Node;
      next: string | null;
      zIndexTop: number;
      fetchedAt: number;
      lastFetchedAt: number;
    };
  };
}

const initialState: CommentsState = {
  ids: [],
  items: {
    /*
      "post_id": {
          comments: tree,
          next: 'pagination cursor',
          zIndexTop: 1000000,
          fetchedAt: ,
          lastFetchedAt: , // last time any new comments were fetched.
      }
    */
  },
};

export const defaultCommentZIndex = 100000;

const typeCommentsAdded = 'comments/commentsAdded';
const typeNewCommentAdded = 'comments/newCommentAdded';
const typeReplyCommentsAdded = 'comments/replyCommentsAdded';
const typeMoreCommentsAdded = 'comments/moreCommentsAdded';

export default function commentsReducer(
  state: CommentsState = initialState,
  action: UnknownAction
): CommentsState {
  switch (action.type) {
    case typeCommentsAdded: {
      const {
        postId,
        comments: commentsList,
        next,
      } = action.payload as { postId: string; comments: Comment[]; next: string | null };
      if (state.ids.includes(postId)) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [postId]: {
            comments: commentsTree(commentsList),
            next,
            zIndexTop: defaultCommentZIndex,
            fetchedAt: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      };
    }
    case typeMoreCommentsAdded: {
      const { postId, comments, next } = action.payload as {
        postId: string;
        comments: Node;
        next: string | null;
      };
      return {
        ...state,
        items: {
          [postId]: {
            ...state.items[postId],
            comments,
            next,
            lastFetchedAt: Date.now(),
          },
        },
      };
    }
    case typeNewCommentAdded: {
      const { comment, postId } = action.payload as { comment: Comment; postId: string };
      let updateZIndex = false;
      const root = state.items[postId].comments;
      const node = addComment(root, comment);
      if (node.parent!.parent !== null && root.children) {
        let rootNode = node;
        while (rootNode.parent!.parent) {
          rootNode = rootNode.parent!;
        }
        const children = root.children;
        const newChildren = [];
        for (let i = 0; i < children.length; i++) {
          if (children[i].comment!.id === rootNode.comment!.id) {
            newChildren.push({ ...rootNode });
          } else {
            newChildren.push(children[i]);
          }
        }
        root.children = newChildren;
      } else {
        updateZIndex = true;
      }
      return {
        ...state,
        items: {
          ...state.items,
          [postId]: {
            ...state.items[postId],
            comments: { ...root },
            zIndexTop: updateZIndex
              ? state.items[postId].zIndexTop + 1
              : state.items[postId].zIndexTop,
          },
        },
      };
    }
    case typeReplyCommentsAdded: {
      const { postId, comments } = action.payload as { postId: string; comments: Comment[] };
      const newComments: Comment[] = [];
      const root = state.items[postId].comments;
      comments.forEach((comment) => {
        if (searchTree(root, comment.id) === null) newComments.push(comment);
      });
      return {
        ...state,
        items: {
          ...state.items,
          [postId]: {
            ...state.items[postId],
            comments: { ...commentsTree(newComments, root) },
            lastFetchedAt: Date.now(),
          },
        },
      };
    }
    default:
      return state;
  }
}

export const commentsAdded = (postId: string, comments: Comment[], next: string | null) => {
  return {
    type: typeCommentsAdded,
    payload: {
      postId,
      comments,
      next,
    },
  };
};

export const newCommentAdded = (postId: string, comment: Comment) => (dispatch: AppDispatch) => {
  dispatch({ type: typeNewCommentAdded, payload: { postId, comment } });
  dispatch(commentsCountIncremented(postId));
};

export const replyCommentsAdded = (postId: string, comments: Comment[]) => {
  return { type: typeReplyCommentsAdded, payload: { postId, comments } };
};

export const moreCommentsAdded = (postId: string, comments: Node, next: string | null) => {
  return {
    type: typeMoreCommentsAdded,
    payload: {
      postId,
      comments,
      next,
    },
  };
};

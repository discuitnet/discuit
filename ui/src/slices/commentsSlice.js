import { addComment, commentsTree, searchTree } from './commentsTree';
import { commentsCountIncremented } from './postsSlice';

const initialState = {
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

export default function commentsReducer(state = initialState, action) {
  switch (action.type) {
    case typeCommentsAdded: {
      const { postId, comments: commentsList, next } = action.payload;
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
      const { postId, comments, next } = action.payload;
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
      const { comment, postId } = action.payload;
      let updateZIndex = false;
      const root = state.items[postId].comments;
      const node = addComment(root, comment);
      if (node.parent.parent !== null && root.children) {
        let rootNode = node;
        while (rootNode.parent.parent) {
          rootNode = rootNode.parent;
        }
        const children = root.children;
        const newChildren = [];
        for (let i = 0; i < children.length; i++) {
          if (children[i].comment.id === rootNode.comment.id) {
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
      const { postId, comments } = action.payload;
      const newComments = [];
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

export const commentsAdded = (postId, comments, next) => {
  return {
    type: typeCommentsAdded,
    payload: {
      postId,
      comments,
      next,
    },
  };
};

export const newCommentAdded = (postId, comment) => (dispatch) => {
  dispatch({ type: typeNewCommentAdded, payload: { postId, comment } });
  dispatch(commentsCountIncremented(postId));
};

export const replyCommentsAdded = (postId, comments) => {
  return { type: typeReplyCommentsAdded, payload: { postId, comments } };
};

export const moreCommentsAdded = (postId, comments, next) => {
  return {
    type: typeMoreCommentsAdded,
    payload: {
      postId,
      comments,
      next,
    },
  };
};

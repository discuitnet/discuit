import { Community, Post as ServerPost } from '../serverTypes';
import { AppDispatch, UnknownAction } from '../store';
import { feedItemHeightChanged } from './feedsSlice';

export interface Post extends ServerPost {
  community?: Community;
  fetchedAt: number;
  imageGalleryIndex: number;
  hidden: boolean;
}

export interface PostsState {
  ids: string[];
  items: { [key: string]: Post };
  feedWidth: number;
}

const initialState: PostsState = {
  ids: [],
  items: {},
  feedWidth: 0,
};

const typePostsAdded = 'posts/typePostsAdded';
const typeCommentsCountIncremented = 'posts/commentsCountIncremented';
const typeImageGalleryIndexUpdated = 'posts/imageGalleryIndexUpdated';
const typePostHidden = 'posts/hidden';

export default function postsReducer(state = initialState, action: UnknownAction) {
  switch (action.type) {
    case typePostsAdded: {
      const posts = action.payload as ServerPost[];
      const newIds = posts
        .filter((post) => Boolean(state.items[post.publicId]) === false)
        .map((post) => post.publicId);
      const newItems = {
        ...state.items,
      };
      posts.forEach((post) => {
        newItems[post.publicId] = preparePost(post);
      });
      return {
        ...state,
        ids: [...state.ids, ...newIds],
        items: {
          ...newItems,
        },
      };
    }
    case typeCommentsCountIncremented: {
      const post = state.items[action.payload as string];
      return {
        ...state,
        items: {
          ...state.items,
          [post.publicId]: {
            ...post,
            noComments: post.noComments + 1,
          },
        },
      };
    }
    case typeImageGalleryIndexUpdated: {
      const { postId, imageGalleryIndex } = action.payload as {
        postId: string;
        imageGalleryIndex: number;
      };
      const post = state.items[postId];
      if (!post) {
        return state;
      }
      return {
        ...state,
        items: {
          ...state.items,
          [post.publicId]: {
            ...post,
            imageGalleryIndex,
          },
        },
      };
    }
    case typePostHidden: {
      const { postId, hidden } = action.payload as { postId: string; hidden: boolean };
      const post = state.items[postId];
      if (!post) {
        return state;
      }
      return {
        ...state,
        items: {
          ...state.items,
          [post.publicId]: {
            ...post,
            hidden: hidden,
          },
        },
      };
    }
    default:
      return state;
  }
}

function preparePost(post: ServerPost | Post): Post {
  return {
    ...post,
    community: undefined,
    comments: undefined,
    commentsNext: undefined,
    fetchedAt: Date.now(),
    imageGalleryIndex: 0,
    hidden: false,
  };
}

export const multiplePostsAdded = (posts: ServerPost[]) => {
  return { type: typePostsAdded, payload: posts };
};

export const postAdded = (post: ServerPost) => {
  return multiplePostsAdded([post]);
};

export const commentsCountIncremented = (postId: string) => {
  return { type: typeCommentsCountIncremented, payload: postId };
};

export const postImageGalleryIndexUpdated = (postId: string, newIndex: number) => {
  return { type: typeImageGalleryIndexUpdated, payload: { postId, imageGalleryIndex: newIndex } };
};

// The postId is the public id of the post.
export const postHidden =
  (postId: string, hidden = true, feedItemKey?: string) =>
  (dispatch: AppDispatch) => {
    dispatch({ type: typePostHidden, payload: { postId, hidden } });
    if (feedItemKey) {
      window.setTimeout(() => {
        dispatch(feedItemHeightChanged(feedItemKey, null));
      }, 10);
    }
  };

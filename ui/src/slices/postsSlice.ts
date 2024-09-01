import { Community, Post as ServerPost } from '../serverTypes';

export interface Post extends ServerPost {
  community?: Community;
  fetchedAt: number;
  imageGalleryIndex: number;
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

export default function postsReducer(
  state = initialState,
  action: { type: string; payload: unknown }
) {
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

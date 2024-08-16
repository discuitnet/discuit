const initialState = {
  ids: [],
  items: {},
  feedWidth: 0,
};

const typePostsAdded = 'posts/typePostsAdded';
const typeCommentsCountIncremented = 'posts/commentsCountIncremented';
const typeImageGalleryIndexUpdated = 'posts/imageGalleryIndexUpdated';

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case typePostsAdded: {
      const posts = action.payload;
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
      const post = state.items[action.payload];
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
      const { postId, imageGalleryIndex } = action.payload;
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

function preparePost(post) {
  return {
    ...post,
    community: undefined,
    comments: undefined,
    commentsNext: undefined,
    fetchedAt: Date.now(),
    imageGalleryIndex: 0,
  };
}

export const multiplePostsAdded = (posts) => {
  return { type: typePostsAdded, payload: posts };
};

export const postAdded = (post) => {
  return multiplePostsAdded([post]);
};

export const commentsCountIncremented = (postId) => {
  return { type: typeCommentsCountIncremented, payload: postId };
};

export const postImageGalleryIndexUpdated = (postId, newIndex) => {
  return { type: typeImageGalleryIndexUpdated, payload: { postId, imageGalleryIndex: newIndex } };
};

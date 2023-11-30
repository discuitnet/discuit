import { multiplePostsAdded } from './postsSlice';

const initialState = {
  urls: [],
  feeds: {
    /*
    "url": {
      keys: [], // each key points to feedItems entry
      next: '', // pagination cursor
      inView: [], // list of keys of nodes in view
      loading: true,
    }
    */
  },
  feedItems: {}, // [key] => item
};

export function FeedItem(item, type, key) {
  this.item = item; // depends on type
  this.type = type;
  this.key = key;
  this.height = null;
}

export const typeFeedUpdated = 'feeds/feedUpdated';
export const typeFeedReloaded = 'feeds/feedReloaded';
export const typeFeedItemHeightChanged = 'feeds/feedItemHeightChanged';
export const typeFeedItemsInViewUpdated = 'feeds/feedItemsInViewUpdated';

export default function feedsReducer(state = initialState, action) {
  switch (action.type) {
    case typeFeedUpdated: {
      const { url, items, next } = action.payload;
      const keys = items.map((item) => item.key);
      const feedExists = Boolean(state.feeds[url]);
      const loading = feedExists && state.feeds[url].loading; // a reload
      let feed = { inView: [], loading: false };
      if (feedExists && !loading) {
        feed = {
          ...feed,
          keys: [...state.feeds[url].keys, ...keys],
          next,
        };
      } else {
        feed = { ...feed, keys, next };
      }
      const feedItems = {};
      items.forEach((item) => {
        // Preserve height, etc of existing items.
        if (state.feedItems[item.key]) {
          item = {
            ...state.feedItems[item.key],
            ...item,
          };
        }
        feedItems[item.key] = item;
      });
      return {
        ...state,
        feeds: {
          ...state.feeds,
          [url]: feed,
        },
        feedItems: {
          ...state.feedItems,
          ...feedItems,
        },
      };
    }
    case typeFeedReloaded: {
      const url = action.payload;
      return {
        ...state,
        feeds: {
          ...state.feeds,
          [url]: {
            ...state.feeds[url],
            loading: true,
          },
        },
      };
    }
    case typeFeedItemHeightChanged: {
      const { key, height } = action.payload;
      return {
        ...state,
        feedItems: {
          ...state.feedItems,
          [key]: {
            ...state.feedItems[key],
            height: height,
          },
        },
      };
    }
    case typeFeedItemsInViewUpdated: {
      const { url, keys } = action.payload;
      return {
        ...state,
        feeds: {
          ...state.feeds,
          [url]: {
            ...state.feeds[url],
            inView: keys,
          },
        },
      };
    }
    default:
      return state;
  }
}

// Return an object with the following signature:
//   {
//     items: [], // an array of FeedItems
//     next: '', // next cursor
//   }
export const selectFeed = (url) => (state) => {
  if (!state.feeds.feeds[url]) return undefined;
  if (state.feeds.feeds[url].loading) {
    return { loading: true, items: [], next: undefined };
  }
  const { keys, next, loading } = state.feeds.feeds[url];
  let items = keys
    .map((key) => state.feeds.feedItems[key])
    .map((item) => {
      return {
        ...item,
        item: item.type === 'post' ? state.posts.items[item.item] : item.item,
      };
    });
  return { items, next, loading };
};

export const selectFeedInViewItems = (url) => (state) => {
  if (!state.feeds.feeds[url]) return [];
  return state.feeds.feeds[url].inView;
};

export const feedUpdated = (url, items, next) => (dispatch) => {
  const posts = items.filter((item) => item.type === 'post').map((item) => item.item);
  items = items.map((item) => {
    if (item.type === 'post') item.item = item.item.publicId;
    return item;
  });
  dispatch(multiplePostsAdded(posts));
  dispatch({ type: typeFeedUpdated, payload: { url, items, next } });
};

export const feedReloaded = (url) => {
  return { type: typeFeedReloaded, payload: url };
};

export const feedItemHeightChanged = (key, height) => {
  return { type: typeFeedItemHeightChanged, payload: { key, height } };
};

export const feedInViewItemsUpdated = (url, keys) => {
  return { type: typeFeedItemsInViewUpdated, payload: { url, keys } };
};

import { Post } from '../serverTypes';
import { AppDispatch, RootState, UnknownAction } from '../store';
import { multiplePostsAdded } from './postsSlice';

export interface Feed {
  keys: string[];
  next: string | null;
  inView: string[];
  loading: boolean;
}

export interface FeedsState {
  urls: string[];
  feeds: {
    [url: string]: Feed;
  };
  feedItems: {
    [key: string]: FeedItem;
  };
}

const initialState: FeedsState = {
  urls: [],
  feeds: {},
  feedItems: {},
};

export class FeedItem {
  item: unknown;
  type: string;
  key: string;
  height: number | null;
  constructor(item: unknown, type: string, key: string) {
    this.item = item;
    this.type = type;
    this.key = key;
    this.height = null;
  }
}

export const typeFeedUpdated = 'feeds/feedUpdated';
export const typeFeedReloaded = 'feeds/feedReloaded';
export const typeFeedItemHeightChanged = 'feeds/feedItemHeightChanged';
export const typeFeedItemsInViewUpdated = 'feeds/feedItemsInViewUpdated';

export default function feedsReducer(
  state: FeedsState = initialState,
  action: UnknownAction
): FeedsState {
  switch (action.type) {
    case typeFeedUpdated: {
      const { url, items, next } = action.payload as {
        url: string;
        items: FeedItem[];
        next: string | null;
      };
      const keys = items.map((item) => item.key);
      const feedExists = Boolean(state.feeds[url]);
      const loading = feedExists && state.feeds[url].loading; // a reload
      let feed: Feed = { keys: [], next: '', inView: [], loading: false };
      if (feedExists && !loading) {
        feed = {
          ...feed,
          keys: [...state.feeds[url].keys, ...keys],
          next,
        };
      } else {
        feed = { ...feed, keys, next };
      }
      const feedItems: { [key: string]: FeedItem } = {};
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
      const url = action.payload as string;
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
      const { key, height } = action.payload as { key: string; height: number | null };
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
      const { url, keys } = action.payload as { url: string; keys: string[] };
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
export const selectFeed = (url: string) => (state: RootState) => {
  if (!state.feeds.feeds[url]) return undefined;
  if (state.feeds.feeds[url].loading) {
    return { loading: true, items: [], next: undefined };
  }
  const { keys, next, loading } = state.feeds.feeds[url];
  const items = keys
    .map((key) => state.feeds.feedItems[key])
    .map((item) => {
      return {
        ...item,
        item: item.type === 'post' ? state.posts.items[item.item as string] : item.item,
      };
    });
  return { items, next, loading };
};

export const selectFeedInViewItems = (url: string) => (state: RootState) => {
  if (!state.feeds.feeds[url]) return [];
  return state.feeds.feeds[url].inView;
};

export const feedUpdated =
  (url: string, items: FeedItem[], next: string | null) => (dispatch: AppDispatch) => {
    const posts = items.filter((item) => item.type === 'post').map((item) => item.item) as Post[];
    items = items.map((item) => {
      if (item.type === 'post') item.item = (item.item as Post).publicId;
      return item;
    });
    dispatch(multiplePostsAdded(posts));
    dispatch({ type: typeFeedUpdated, payload: { url, items, next } });
  };

export const feedReloaded = (url: string) => {
  return { type: typeFeedReloaded, payload: url };
};

export const feedItemHeightChanged = (key: string, height: number | null) => {
  return { type: typeFeedItemHeightChanged, payload: { key, height } };
};

export const feedInViewItemsUpdated = (url: string, keys: string[]) => {
  return { type: typeFeedItemsInViewUpdated, payload: { url, keys } };
};

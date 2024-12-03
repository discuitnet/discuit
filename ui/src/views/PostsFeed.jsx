import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import Feed from '../components/Feed';
import { MemorizedPostCard } from '../components/PostCard/PostCard';
import SelectBar from '../components/SelectBar';
import { mfetchjson } from '../helper';
import { useCanonicalTag } from '../hooks';
import { isInfiniteScrollingDisabled } from '../pages/Settings/devicePrefs';
import { FeedItem, feedReloaded } from '../slices/feedsSlice';
import WelcomeBanner from './WelcomeBanner';

const sortOptions = [
  { text: 'Hot', id: 'hot' },
  { text: 'Activity', id: 'activity' },
  { text: 'New', id: 'latest' },
  { text: 'Top Day', id: 'day' },
  { text: 'Top Week', id: 'week' },
  { text: 'Top Month', id: 'month' },
  { text: 'Top Year', id: 'year' },
  { text: 'Top All', id: 'all' },
];
const sortDefault = import.meta.env.VITE_DEFAULTFEEDSORT;
const baseURL = '/api/posts';

export const homeReloaded = (homeFeed = 'all', rememberFeedSort = false) => {
  const params = new URLSearchParams();
  let sort = sortDefault;
  if (rememberFeedSort) {
    sort = window.localStorage.getItem('feedSort') || sortDefault;
  }
  params.set('sort', sort);
  if (homeFeed === 'subscriptions') params.set('feed', 'home');
  return feedReloaded(`${baseURL}?${params.toString()}`);
};

function useFeedSort(rememberLastSort = false) {
  const location = useLocation();

  let sortSaved;
  if (rememberLastSort) {
    sortSaved = window.localStorage.getItem('feedSort');
  } else {
    const params = new URLSearchParams(location.search);
    sortSaved = params.get('sort');
  }
  sortSaved = sortSaved || sortDefault;

  // If sortOptions.to is preset, use query parameters and go to the link.
  for (let i = 0; i < sortOptions.length; i++) {
    if (rememberLastSort) {
      sortOptions[i].to = undefined;
    } else {
      if (sortOptions[i].id === sortDefault) {
        sortOptions[i].to = location.pathname;
      } else {
        sortOptions[i].to = `${location.pathname}?sort=${sortOptions[i].id}`;
      }
    }
  }

  const history = useHistory();
  const [sort, _setSort] = useState(sortSaved);

  const setSort = (newSort) => {
    _setSort(newSort);
    if (rememberLastSort) {
      window.localStorage.setItem('feedSort', newSort);
    } else {
      let to = '#';
      sortOptions.filter((option) => option.id === newSort).forEach((option) => (to = option.to));
      history.replace(to);
    }
  };

  useEffect(() => {
    if (!rememberLastSort) {
      const params = new URLSearchParams(location.search);
      _setSort(params.get('sort') || sortDefault);
    }
  }, [location]);

  return [sort, setSort];
}

const PostsFeed = ({ feedType = 'all', communityId = null }) => {
  const dispatch = useDispatch();
  // const history = useHistory();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const location = useLocation();
  // const params = new URLSearchParams(location.search);
  // const sort = params.get('sort') || sortDefault;
  const [sort, setSort] = useFeedSort(user && user.rememberFeedSort);

  // The ordering of the urlparams here is important because the items are
  // stored by the url as the key.
  const urlParams = new URLSearchParams();
  urlParams.set('sort', sort);
  if (loggedIn && feedType === 'subscriptions') {
    urlParams.set('feed', 'home');
  }
  if (communityId !== null) urlParams.set('communityId', communityId);
  const feedId = `${baseURL}?${urlParams.toString()}`; // api endpoint.

  // Only called on button clicks (not history API changes)
  const handleSortChange = (value) => {
    setSort(value);
    dispatch(feedReloaded(feedId));
  };

  const layout = useSelector((state) => state.main.feedLayout);
  const compact = layout === 'compact';

  const handleRenderItem = (item, index) => {
    return (
      <MemorizedPostCard
        initialPost={item.item}
        index={index}
        disableEmbeds={user && user.embedsOff}
        compact={compact}
        feedItemKey={item.key}
        canHideFromFeed
      />
    );
  };

  const canonicalURL = () => {
    const sortValid = sortOptions.filter((option) => option.id === sort).length !== 0;
    if (!sortValid) return '';
    const url = window.location;
    const search = sort === sortDefault ? '' : `?sort=${sort}`;
    return url.origin + url.pathname + search;
  };
  useCanonicalTag(canonicalURL(), [location]);

  let name = 'Posts';
  if (!communityId) {
    if (feedType === 'all') {
      name = 'Home';
    } else if (feedType === 'subscriptions') {
      name = 'Subscriptions';
    }
  }

  const handleFetch = async (next) => {
    const params = new URLSearchParams(urlParams.toString());
    if (next) {
      params.set('next', next);
    }
    const url = `${baseURL}?${params.toString()}`;
    const res = await mfetchjson(url);
    const feedItems = (res.posts ?? []).map((post) => new FeedItem(post, 'post', post.publicId));
    return {
      items: feedItems,
      next: res.next,
    };
  };

  return (
    <div className="posts-feed">
      {/*<PostsFilterBar name={name} sort={sort} onChange={handleSortChange} />*/}
      <SelectBar name={name} options={sortOptions} value={sort} onChange={handleSortChange} />
      <Feed
        feedId={feedId}
        compact={compact}
        onFetch={handleFetch}
        onRenderItem={handleRenderItem}
        banner={!loggedIn ? <WelcomeBanner className="is-m is-in-feed" /> : null}
        infiniteScrollingDisabled={isInfiniteScrollingDisabled()}
      />
    </div>
  );
};

PostsFeed.propTypes = {
  communityId: PropTypes.string,
  feedType: PropTypes.oneOf(['all', 'subscriptions', 'community']),
};

export default PostsFeed;

const PostsFilterBar = ({ name, sort = 'latest', onChange, rememberLastSort = false }) => {
  const location = useLocation();

  return <SelectBar name={name} options={sortOptions} value={sort} onChange={onChange} />;
};

PostsFilterBar.propTypes = {
  name: PropTypes.string,
  sort: PropTypes.string,
  onChange: PropTypes.func,
  rememberLastSort: PropTypes.bool,
};

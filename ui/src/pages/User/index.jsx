import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import MiniFooter from '../../components/MiniFooter';
import Sidebar from '../../components/Sidebar';
import { APIError, dateString1, mfetch, mfetchjson, stringCount } from '../../helper';
import { useDispatch } from 'react-redux';
import { snackAlertError } from '../../slices/mainSlice';
import { MemorizedComment } from './Comment';
import { MemorizedPostCard } from '../../components/PostCard/PostCard';
import MarkdownBody from '../../components/MarkdownBody';
import ShowMoreBox from '../../components/ShowMoreBox';
import { useSelector } from 'react-redux';
import {
  feedInViewItemsUpdated,
  FeedItem,
  feedItemHeightChanged,
  feedUpdated,
  selectFeed,
  selectFeedInViewItems,
} from '../../slices/feedsSlice';
import { selectUser, userAdded } from '../../slices/usersSlice';
import PageLoading from '../../components/PageLoading';
import Feed from '../../components/Feed';
import NotFound from '../NotFound';
import { Helmet } from 'react-helmet-async';
import SelectBar from '../../components/SelectBar';
import { useHistory } from 'react-router-dom';
import { Link } from 'react-router-dom/cjs/react-router-dom.min';
import CommunityLink from '../../components/PostCard/CommunityLink';
import Dropdown from '../../components/Dropdown';
import { ButtonMore } from '../../components/Button';
import { useMuteUser } from '../../hooks';

const User = ({ username }) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const viewer = useSelector((state) => state.main.user);
  const loggedIn = viewer !== null;

  const isUserFeedAvailable = (user, viewer) => {
    return !user.isBanned || (user.isBanned && viewer !== null && viewer.isAdmin);
  };

  const user = useSelector(selectUser(username));
  const [userLoading, setUserLoading] = useState(user ? 'loaded' : 'loading');

  const url = `/api/users/${username}`;
  const feedUrl = `${url}/feed`;
  const feed = useSelector(selectFeed(feedUrl));
  const setFeed = (res) => {
    const items = res.items ?? [];
    const next = res.next ?? null;
    const newItems = items.map((item) => {
      if (item.type === 'post') {
        return new FeedItem(item.item, 'post', item.item.publicId);
      }
      if (item.type === 'comment') {
        return new FeedItem(item.item, 'comment', item.item.id);
      }
    });
    dispatch(feedUpdated(feedUrl, newItems, next));
  };
  const [feedLoading, setFeedLoading] = useState(feed ? 'loaded' : 'loading');
  useEffect(() => {
    if (feed && user) {
      return;
    }
    setFeedLoading('loading');
    setUserLoading('loading');
    (async () => {
      try {
        const res = await mfetch(url);
        if (!res.ok) {
          if (res.status === 404) {
            setUserLoading('notfound');
            return;
          }
          throw new APIError(res.status, await res.json());
        }
        const user = await res.json();
        dispatch(userAdded(user));
        setUserLoading('loaded');
        if (isUserFeedAvailable(user, viewer)) {
          const feed = await mfetchjson(`${url}/feed`);
          setFeed(feed);
          setFeedLoading('loaded');
        }
        if (username !== user.username) history.replace(`/@${user.username}`);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [username]);

  const [feedReloading, setFeedReloading] = useState(false);
  const fetchNextItems = async () => {
    if (feedReloading) return;
    try {
      setFeedReloading(true);
      const res = await mfetchjson(`${url}/feed?next=${feed.next}`);
      setFeed(res);
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setFeedReloading(false);
    }
  };

  const handleItemHeightChange = (height, item) => {
    dispatch(feedItemHeightChanged(item.key, height));
  };

  const itemsInitiallyInView = useSelector(selectFeedInViewItems(feedUrl));
  const handleSaveVisibleItems = (items) => {
    dispatch(feedInViewItemsUpdated(feedUrl, items));
  };

  const handleBanUser = async () => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await mfetch(`/api/_admin`, {
        method: 'POST',
        body: JSON.stringify({
          action: user.isBanned ? 'unban_user' : 'ban_user',
          username: user.username,
        }),
      });
      if (res.status === 200) {
        alert(`User ${user.isBanned ? 'un' : ''}banned successfully.`);
        window.location.reload();
      } else {
        alert('Failed to ban user: ' + (await res.text()));
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [tab, setTab] = useState('content'); // content or about
  useEffect(() => {
    setTab('content');
  }, [location.pathname]);

  const [feedFilter, setFeedFilter] = useState('overview');
  const handleFilterChange = (id) => setFeedFilter(id);

  const { isMuted, toggleMute } = useMuteUser(
    user ? { userId: user.id, username: user.username } : {}
  );

  if (userLoading === 'notfound') {
    return <NotFound />;
  }

  if (!user) {
    return <PageLoading />;
  }

  const hasFeed = isUserFeedAvailable(user, viewer);
  if (!hasFeed) {
    // User is banned and the viewer is no admin
    return (
      <div className="page-content page-notfound wrap">
        <h1>@{user.username} account suspended.</h1>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (!feed) {
    return <PageLoading />;
  }

  const handleRenderItem = (item) => {
    if (item.type === 'post') {
      return <MemorizedPostCard initialPost={item.item} />;
    }
    if (item.type === 'comment') {
      return <MemorizedComment comment={item.item} />;
    }
  };

  const renderSummary = () => {
    return (
      <div className="card card-sub page-user-summary">
        <div className="card-head">
          <div className="card-title">Summary</div>
        </div>
        <div className="card-content">
          <div className="card-list-item user-summary-item">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 7V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V7C3 4 4.5 2 8 2H16C19.5 2 21 4 21 7Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.5 4.5V6.5C14.5 7.6 15.4 8.5 16.5 8.5H18.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 13H12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 17H16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>{stringCount(user.noPosts, false, 'post')}</div>
          </div>
          <div className="user-summary-item">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22.81C11.31 22.81 10.66 22.46 10.2 21.85L8.7 19.85C8.67 19.81 8.55 19.76 8.5 19.75H8C3.83 19.75 1.25 18.62 1.25 13V8C1.25 3.58 3.58 1.25 8 1.25H16C20.42 1.25 22.75 3.58 22.75 8V13C22.75 17.42 20.42 19.75 16 19.75H15.5C15.42 19.75 15.35 19.79 15.3 19.85L13.8 21.85C13.34 22.46 12.69 22.81 12 22.81ZM8 2.75C4.42 2.75 2.75 4.42 2.75 8V13C2.75 17.52 4.3 18.25 8 18.25H8.5C9.01 18.25 9.59 18.54 9.9 18.95L11.4 20.95C11.75 21.41 12.25 21.41 12.6 20.95L14.1 18.95C14.43 18.51 14.95 18.25 15.5 18.25H16C19.58 18.25 21.25 16.58 21.25 13V8C21.25 4.42 19.58 2.75 16 2.75H8Z"
                fill="currentColor"
              ></path>
              <path
                d="M17 8.75H7C6.59 8.75 6.25 8.41 6.25 8C6.25 7.59 6.59 7.25 7 7.25H17C17.41 7.25 17.75 7.59 17.75 8C17.75 8.41 17.41 8.75 17 8.75Z"
                fill="currentColor"
              ></path>
              <path
                d="M13 13.75H7C6.59 13.75 6.25 13.41 6.25 13C6.25 12.59 6.59 12.25 7 12.25H13C13.41 12.25 13.75 12.59 13.75 13C13.75 13.41 13.41 13.75 13 13.75Z"
                fill="currentColor"
              ></path>
            </svg>
            <div>{stringCount(user.noComments, false, 'comment')}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderModOf = () => {
    if (!(user.moddingList && user.moddingList.length > 0)) {
      return null;
    }
    return (
      <div className="card card-sub page-user-modlist">
        <div className="card-head">
          <div className="card-title">Moderator of</div>
        </div>
        <div className="card-content">
          <div className="card-list">
            {user.moddingList &&
              user.moddingList.map((community) => (
                <div className="card-list-item">
                  <CommunityLink name={community.name} proPic={community.proPic} />
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const items = feed ? feed.items : [];

  return (
    <div className="page-content page-user wrap page-grid">
      <Helmet>
        <title>{`@${user.username}`}</title>
      </Helmet>
      <Sidebar />
      <main className="page-middle">
        <header className="user-card card card-padding">
          <div className="user-card-top">
            <h1 className="user-card-username">
              @{username}
              {user.isAdmin && <span className="user-card-is-admin">Admin</span>}
            </h1>
            <div className="user-card-points">{`${user.points.toLocaleString()} ${stringCount(
              user.points,
              true,
              'point'
            )}`}</div>
          </div>
          {user.aboutMe && (
            <div className="user-card-desc">
              <ShowMoreBox showButton maxHeight="120px">
                <MarkdownBody>{user.aboutMe}</MarkdownBody>
              </ShowMoreBox>
            </div>
          )}
          <div className="user-card-joined">Joined on {dateString1(user.createdAt)}.</div>
          {loggedIn && (
            <div className="user-card-buttons" style={{ alignItems: 'flex-start' }}>
              <button onClick={toggleMute}>{isMuted ? 'Unmute user' : 'Mute user'}</button>
              {viewer.isAdmin && (
                <button className="button-red" onClick={handleBanUser}>
                  {user.isBanned ? `Unban user` : 'Ban user'}
                </button>
              )}
              {viewer.isAdmin && user.isBanned && (
                <div style={{ marginTop: '1rem' }}>
                  User banned on: {new Date(user.bannedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
          <div className="tabs is-m">
            <button
              className={'button-clear tab-item' + (tab === 'content' ? ' is-active' : '')}
              onClick={() => setTab('content')}
            >
              Posts
            </button>
            <button
              className={'button-clear tab-item' + (tab === 'about' ? ' is-active' : '')}
              onClick={() => setTab('about')}
            >
              About
            </button>
          </div>
        </header>
        {/*
        <SelectBar
          name="Feed"
          options={[
            { text: 'Overview', id: 'overview' },
            { text: 'Posts', id: 'posts' },
            { text: 'Comments', id: 'comments' },
          ]}
          value={feedFilter}
          onChange={handleFilterChange}
        />
        */}
        <div className="page-user-feed">
          {tab === 'content' && (
            <Feed
              loading={feedLoading !== 'loaded'}
              items={items}
              hasMore={Boolean(feed ? feed.next : false)}
              onNext={fetchNextItems}
              isMoreItemsLoading={feedReloading}
              onRenderItem={handleRenderItem}
              onItemHeightChange={handleItemHeightChange}
              itemsInitiallyInView={itemsInitiallyInView}
              onSaveVisibleItems={handleSaveVisibleItems}
            />
          )}
          {tab === 'about' && (
            <>
              {renderSummary()}
              {renderModOf()}
            </>
          )}
        </div>
      </main>
      <aside className="page-right">
        {renderSummary()}
        {renderModOf()}
        {/* <div className="card card-sub user-moderates">
          <div className="card-head">
            <div className="card-title">Moderates</div>
          </div>
          <div className="card-content">
            <div>TODO</div>
          </div>
        </div> */}
        <MiniFooter />
      </aside>
    </div>
  );
};

User.propTypes = {
  username: PropTypes.string.isRequired,
};

export default User;

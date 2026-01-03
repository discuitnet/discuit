import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import { ButtonMore } from '../../components/Button';
import Dropdown from '../../components/Dropdown';
import Feed from '../../components/Feed';
import ImageEditModal from '../../components/ImageEditModal';
import MarkdownBody from '../../components/MarkdownBody';
import MiniFooter from '../../components/MiniFooter';
import PageLoading from '../../components/PageLoading';
import CommunityLink from '../../components/PostCard/CommunityLink';
import { MemorizedPostCard } from '../../components/PostCard/PostCard';
import SelectBar from '../../components/SelectBar';
import ShowMoreBox from '../../components/ShowMoreBox';
import Sidebar from '../../components/Sidebar';
import UserProPic from '../../components/UserProPic';
import {
  APIError,
  dateString1,
  mfetch,
  mfetchjson,
  selectImageCopyURL,
  stringCount,
} from '../../helper';
import { useFetchUsersLists, useMuteUser } from '../../hooks';
import { useImageEdit } from '../../hooks/useImageEdit';
import type { Comment, User } from '../../serverTypes';
import { FeedItem } from '../../slices/feedsSlice';
import { MainState, snackAlert, snackAlertError, userLoggedIn } from '../../slices/mainSlice';
import { Post } from '../../slices/postsSlice';
import { selectUser, userAdded } from '../../slices/usersSlice';
import { RootState } from '../../store';
import { SVGComment } from '../../SVGs';
import NotFound from '../NotFound';
import { isInfiniteScrollingDisabled } from '../Settings/devicePrefs';
import BadgesList from './BadgesList';
import BanUserButton from './BanUserButton';
import { MemorizedComment } from './Comment';
import UserAdminsViewModal from './UserAdminsViewModal';

interface UserFeedAPIResponse {
  items: {
    type: string;
    item: unknown;
  }[];
  next: string | null;
}

function formatFilterText(filter = '') {
  filter.toLowerCase();
  if (filter === 'posts' || filter === 'comments') {
    return filter;
  }
  return 'overview';
}

const User = () => {
  const { username } = useParams<{ username: string }>();

  const dispatch = useDispatch();
  const history = useHistory();

  const viewer = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const viewerAdmin = viewer ? viewer.isAdmin : false;
  const loggedIn = viewer !== null;

  const [profilePicModalOpen, setProfilePicModalOpen] = useState(false);

  const {
    isUploading: isUploadingPic,
    isDeleting: isDeletingPic,
    handleUpload: handleUploadProfilePic,
    handleDelete: handleDeleteProfilePic,
    handleSaveAltText,
  } = useImageEdit<User>(`/api/users/${username}/pro_pic`, (res) => {
    dispatch(userLoggedIn(res));
    dispatch(userAdded(res));
  });

  const handleSaveProfilePicAlt = (altText: string) => {
    if (!user) return dispatch(snackAlert('No user to update.', null));
    if (!user.proPic) return dispatch(snackAlert('No profile picture to update.', null));
    handleSaveAltText(altText, user.proPic.id).then((success) => {
      if (success) {
        if (user.proPic) user.proPic.altText = altText;
        setProfilePicModalOpen(false);
      }
    });
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const feedFilter = formatFilterText(queryParams.get('filter') ?? '');
  const selectBarOptions = [
    { text: 'Overview', id: 'overview', queryParam: '', to: '' },
    { text: 'Posts', id: 'posts', queryParam: 'posts', to: '' },
    { text: 'Comments', id: 'comments', queryParam: 'comments', to: '' },
  ];
  for (let i = 0; i < selectBarOptions.length; i++) {
    const param = selectBarOptions[i].queryParam;
    let search = '';
    if (param !== '') {
      queryParams.set('filter', param);
      search = queryParams.toString();
    }
    selectBarOptions[i].to = `${location.pathname}?${search}`;
  }
  const handleSelectBarChange = (id: string) => {
    if (feedFilter !== id) {
      history.replace(selectBarOptions.filter((item) => item.id === id)[0].to);
    }
  };

  const isUserFeedAvailable = (user: User, viewer: User | null) => {
    return !user.isBanned || (user.isBanned && viewer !== null && viewerAdmin);
  };

  const user = useSelector(selectUser(username)) || null;
  const [userLoading, setUserLoading] = useState(user ? 'loaded' : 'loading');

  const url = `/api/users/${username}`;
  const feedId = `${url}/feed?filter=${feedFilter === 'overview' ? '' : feedFilter}`; // partial endpoint

  useEffect(() => {
    if (user) {
      return;
    }
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
        if (username !== user.username && username.toLowerCase() === user.username.toLowerCase()) {
          // Username case mismatch.
          history.replace(`/@${user.username}`);
        }
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [username, url, feedId]);

  const handleFeedFetch = async (next: string | null | undefined = null) => {
    const url = next === null ? feedId : `${feedId}&next=${next}`;
    const res = (await mfetchjson(url)) as UserFeedAPIResponse;
    const items = (res.items || []).map((item) => {
      if (item.type === 'post') {
        const post = item.item as Post;
        return new FeedItem(post, 'post', post.id);
      }
      if (item.type === 'comment') {
        const comment = item.item as Comment;
        return new FeedItem(comment, 'comment', comment.id);
      }
      throw new Error('unknown user-feed item type');
    });
    return {
      items,
      next: res.next,
    };
  };

  const refetchUser = async () => {
    const user = await mfetchjson(url);
    dispatch(userAdded(user));
  };

  const hasSupporterBadge = userHasSupporterBadge(user);
  const handleGiveSupporterBadge = async () => {
    if (!user) return;
    try {
      if (hasSupporterBadge) {
        await mfetchjson(`/api/users/${user.username}/badges/supporter?byType=true`, {
          method: 'DELETE',
        });
      } else {
        await mfetchjson(`/api/users/${user.username}/badges`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'supporter',
          }),
        });
      }
      await refetchUser();
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [userAdminsView, setUserAdminsView] = useState(null);
  const [userAdminsViewModalOpen, setUserAdminsViewModalOpen] = useState(false);
  const handleGetUserDetails = async () => {
    if (!user) return;
    try {
      const userAdminsView = await mfetchjson(`/api/users/${user.username}?adminsView=true`);
      setUserAdminsView(userAdminsView);
      setUserAdminsViewModalOpen(true);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [tab, setTab] = useState('content'); // content or about
  useEffect(() => {
    setTab('content');
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 764 && tab === 'about') {
        setTab('content');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [tab]);

  const { isMuted, toggleMute } = useMuteUser(
    user ? { userId: user.id, username: user.username } : { userId: '', username: '' }
  );

  const { lists, error: listsError } = useFetchUsersLists(username, false);

  const layout = useSelector<RootState>((state) => state.main.feedLayout) as string;
  const compact = layout === 'compact';

  if (userLoading === 'notfound') {
    return <NotFound />;
  }

  if (!user) {
    return <PageLoading />;
  }

  if (user.deleted && !viewerAdmin) {
    return (
      <div className="page-content page-notfound wrap">
        <Helmet>
          <title>{`@${user.username}`}</title>
        </Helmet>
        <h1>Account deleted.</h1>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  const hasFeed = isUserFeedAvailable(user, viewer);
  if (!hasFeed) {
    // User is banned and the viewer is no admin
    return (
      <div className="page-content page-notfound wrap">
        <Helmet>
          <title>{`@${user.username}`}</title>
        </Helmet>
        <h1>Account suspended.</h1>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  const handleRenderItem = (item: FeedItem) => {
    if (item.type === 'post') {
      return (
        <MemorizedPostCard
          initialPost={item.item as Post}
          disableEmbeds={user && user.embedsOff}
          compact={compact}
          feedItemKey={item.key}
        />
      );
    }
    if (item.type === 'comment') {
      return <MemorizedComment comment={item.item as Comment} />;
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
            <SVGComment variant="outline" />
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
                <div className="card-list-item" key={community.name}>
                  <CommunityLink name={community.name} proPic={community.proPic} />
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBadgesList = () => {
    if (!user.badges || user.badges.length === 0) {
      return null;
    }
    return (
      <div className="user-badges-list">
        <BadgesList user={user} />
      </div>
    );
  };

  const renderBadges = (hideInMobile = true) => {
    if (!user.badges || user.badges.length === 0) {
      return null;
    }
    return (
      <div className={'card card-sub page-user-modlist' + (hideInMobile ? ' is-no-m' : '')}>
        <div className="card-head">
          <div className="card-title">Badges</div>
        </div>
        <div className="card-content">{renderBadgesList()}</div>
      </div>
    );
  };

  const getLastSeenMonthText = (text: string): string => {
    // text is of the form: 'November 2024'
    const arr = text.split(' ');
    if (arr.length !== 2) {
      throw new Error('lastSeenMonth text split should return an array with 2 elements');
    }
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    if (currentMonth === arr[0] && arr[1] === `${now.getFullYear()}`) {
      return 'last seen this month';
    }
    return `last seen ${text}`;
  };

  const renderLists = () => {
    if (listsError) {
      return (
        <div className="card card-sub page-user-lists">
          <div className="card-head">
            <div className="card-title">Lists</div>
          </div>
          <div className="card-content">
            <div className="card-list-item user-list-item">
              <span>Error loading lists</span>
            </div>
          </div>
        </div>
      );
    }
    if (!lists || lists.length === 0) {
      return null;
    }
    return (
      <div className="card card-sub page-user-modlist">
        <div className="card-head">
          <div className="card-title">Lists</div>
          <div className="card-link">
            <Link to={`/@${username}/lists`}>View all</Link>
          </div>
        </div>
        <div className="card-content">
          <div className="card-list">
            {lists.map((list) => (
              <div className="card-list-item user-list-item" key={list.id}>
                <Link to={`/@${username}/lists/${list.name}`}>
                  <div className="user-list-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 5.25H14C13.59 5.25 13.25 4.91 13.25 4.5C13.25 4.09 13.59 3.75 14 3.75H21C21.41 3.75 21.75 4.09 21.75 4.5C21.75 4.91 21.41 5.25 21 5.25Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M21 10.25H14C13.59 10.25 13.25 9.91 13.25 9.5C13.25 9.09 13.59 8.75 14 8.75H21C21.41 8.75 21.75 9.09 21.75 9.5C21.75 9.91 21.41 10.25 21 10.25Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M21 15.25H3C2.59 15.25 2.25 14.91 2.25 14.5C2.25 14.09 2.59 13.75 3 13.75H21C21.41 13.75 21.75 14.09 21.75 14.5C21.75 14.91 21.41 15.25 21 15.25Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M21 20.25H3C2.59 20.25 2.25 19.91 2.25 19.5C2.25 19.09 2.59 18.75 3 18.75H21C21.41 18.75 21.75 19.09 21.75 19.5C21.75 19.91 21.41 20.25 21 20.25Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M7.92 3.5H5.08C3.68 3.5 3 4.18 3 5.58V8.43C3 9.83 3.68 10.51 5.08 10.51H7.93C9.33 10.51 10.01 9.83 10.01 8.43V5.58C10 4.18 9.32 3.5 7.92 3.5Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </div>
                  <span>{list.displayName}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-content page-user wrap page-grid">
      <Helmet>
        <title>{`@${user.username}`}</title>
      </Helmet>
      <Sidebar />
      <UserAdminsViewModal
        user={userAdminsView}
        open={userAdminsViewModalOpen}
        onClose={() => setUserAdminsViewModalOpen(false)}
      />
      <main className="page-middle">
        <header className="user-card card card-padding">
          <div className="user-card-top">
            <div className="user-card-top-left">
              <UserProPic
                username={username}
                proPic={user.proPic}
                size="large"
                editable={user.id === viewer?.id}
                onEdit={() => setProfilePicModalOpen(true)}
              />
              <h1
                className={
                  'user-card-username' +
                  (hasSupporterBadge ? ' is-supporter' : '') +
                  (user.deleted ? ' is-red' : '')
                }
              >
                @{username}
                {user.isAdmin && <span className="user-card-is-admin">Admin</span>}
              </h1>
            </div>
            <div className="user-card-points">{`${user.points.toLocaleString()} ${stringCount(
              user.points,
              true,
              'point'
            )}`}</div>
          </div>
          {user.aboutMe && (
            <div className="user-card-desc">
              <ShowMoreBox showButton maxHeight="120px" childrenHash={user.aboutMe || ''}>
                <MarkdownBody>{user.aboutMe}</MarkdownBody>
              </ShowMoreBox>
            </div>
          )}
          <div className="user-card-badges is-m">{renderBadgesList()}</div>
          <div className="user-card-joined">
            Joined on {dateString1(user.createdAt)} ({getLastSeenMonthText(user.lastSeenMonth)}).
          </div>
          {user.deleted && (
            <div className="user-card-joined">
              Account deleted on {dateString1(user.deletedAt as string)}
            </div>
          )}
          {loggedIn && (
            <div className="user-card-buttons">
              {viewer.id !== user.id && (
                <button onClick={toggleMute} disabled={user.deleted}>
                  {isMuted ? 'Unmute user' : 'Mute user'}
                </button>
              )}
              {viewerAdmin && (
                <>
                  {viewer.id !== user.id && <BanUserButton user={user} />}
                  <button
                    className="button-green"
                    onClick={handleGiveSupporterBadge}
                    disabled={user.deleted}
                  >
                    {hasSupporterBadge ? 'Remove supporter badge' : 'Give supporter badge'}
                  </button>
                  <Dropdown target={<ButtonMore />}>
                    <div className="dropdown-list">
                      <div className="dropdown-item" onClick={handleGetUserDetails}>
                        User details
                      </div>
                    </div>
                  </Dropdown>
                </>
              )}
              {viewerAdmin && user.isBanned && (
                <div style={{ marginTop: '1rem' }}>
                  User banned on: {new Date(user.bannedAt as string).toLocaleString()}
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
        <div className="page-user-feed">
          {tab === 'content' && (
            <SelectBar
              name=""
              options={selectBarOptions}
              value={feedFilter}
              onChange={handleSelectBarChange}
            />
          )}
          {tab === 'content' && (
            <Feed
              className="posts-feed"
              feedId={feedId}
              onFetch={handleFeedFetch}
              onRenderItem={handleRenderItem}
              infiniteScrollingDisabled={isInfiniteScrollingDisabled()}
              compact={compact}
            />
          )}
          {tab === 'about' && (
            <>
              {renderSummary()}
              {renderBadges()}
              {renderModOf()}
              {renderLists()}
            </>
          )}
        </div>
      </main>
      <aside className="sidebar-right is-custom-scrollbar is-v2">
        {renderSummary()}
        {renderBadges()}
        {renderModOf()}
        {renderLists()}
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

      <ImageEditModal
        open={profilePicModalOpen}
        onClose={() => setProfilePicModalOpen(false)}
        title="Edit profile picture"
        imageUrl={user.proPic ? selectImageCopyURL('medium', user.proPic) : undefined}
        altText={user.proPic?.altText}
        onUpload={handleUploadProfilePic}
        onDelete={handleDeleteProfilePic}
        onSave={handleSaveProfilePicAlt}
        uploading={isUploadingPic}
        deleting={isDeletingPic}
      />
    </div>
  );
};

export default User;

export function userHasSupporterBadge(user: User | null): boolean {
  return Boolean(
    user && (user.badges || []).find((badge) => badge.type === 'supporter') !== undefined
  );
}

import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { ButtonMore } from '../../components/Button';
import CommunityProPic from '../../components/CommunityProPic';
import Dropdown from '../../components/Dropdown';
import Link from '../../components/Link';
import MarkdownBody from '../../components/MarkdownBody';
import MiniFooter from '../../components/MiniFooter';
import PageLoading from '../../components/PageLoading';
import ShowMoreBox from '../../components/ShowMoreBox';
import Sidebar from '../../components/Sidebar';
import { APIError, dateString1, mfetch, stringCount } from '../../helper';
import { useMuteCommunity } from '../../hooks';
import { communityAdded, selectCommunity } from '../../slices/communitiesSlice';
import { snackAlertError } from '../../slices/mainSlice';
import PostsFeed from '../../views/PostsFeed';
import NotFound from '../NotFound';
import Banner from './Banner';
import JoinButton from './JoinButton';
import Rules from './Rules';

const Community = () => {
  const { name } = useParams();

  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();

  const community = useSelector(selectCommunity(name));
  const loading = !(community && Array.isArray(community.mods) && Array.isArray(community.rules));
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!loading) return;
    setError(null);
    (async () => {
      try {
        const res = await mfetch(`/api/communities/${name}?byName=true`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('notfound');
            return;
          }
          throw new APIError(res.status, await res.json());
        }

        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));

        const pathname = `/${rcomm.name}`;
        if (location.pathname !== pathname) {
          history.replace(`${pathname}${location.search}${location.hash}`);
        }
      } catch (error) {
        setError(error.toString());
        dispatch(snackAlertError(error));
      }
    })();
  }, [name, loading, location]);

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  const bannedFrom = useSelector((state) => state.main.bannedFrom);
  const isBanned =
    loggedIn && community && bannedFrom.find((id) => id === community.id) !== undefined;

  const [tab, setTab] = useState('posts');
  useEffect(() => {
    setTab('posts');
  }, [location]);

  const { toggleMute: toggleCommunityMute, displayText: muteDisplayText } = useMuteCommunity(
    community ? { communityId: community.id, communityName: community.name } : {}
  );

  if (loading) {
    if (error === 'notfound') {
      return <NotFound />;
    }
    return <PageLoading />;
  }

  const renderRules = () => {
    if (community.rules) {
      return <Rules rules={community.rules} communityName={community.name} />;
    }
    return null;
  };

  const renderModeratorsList = () => {
    return (
      <div className="card card-sub card-mods">
        <div className="card-head">
          <div className="card-title">Moderators</div>
        </div>
        <div className="card-content">
          <ul>
            {community.mods &&
              community.mods.map((mod) => (
                <li key={mod.id}>
                  <Link to={`/@${mod.username}`}>{mod.username}</Link>
                </li>
              ))}
          </ul>
          {/*loggedIn && <button className="card-mods-message-btn">Message mods</button>*/}
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const url = `/new?community=${community.name}`;
    const handleClick = (e) => {
      e.preventDefault();
      if (!isBanned) {
        history.push(url);
      }
    };
    return (
      <>
        <a
          className={'button button-main border-radius-0' + (isBanned ? ' is-disabled' : '')}
          href={url}
          onClick={handleClick}
        >
          Create post
        </a>
        {(community.userMod || (user && user.isAdmin)) && (
          <Link className="button border-radius-0" to={`/${name}/modtools`}>
            {`MOD TOOLS` + (!community.userMod ? ' (ADMIN)' : '')}
          </Link>
        )}
      </>
    );
  };

  return (
    <div className="page-content page-community wrap page-grid">
      <Helmet>
        <title>{`${community.name}`}</title>
      </Helmet>
      <Sidebar />
      <main className="comm-content">
        <header className="comm-main">
          <div className="comm-main-top">
            <div className="comm-main-bg">
              <Banner community={community} />
            </div>
            <CommunityProPic
              className="is-no-hover comm-main-profile"
              name={community.name}
              proPic={community.proPic}
              size="large"
            />
            <div className="comm-main-top-bar">
              <JoinButton className="comm-main-top-join-button" community={community} />
              {/*loggedIn && (
                <Dropdown target={<ButtonMore vertical />} aligned="right">
                  <div className="dropdown-list">
                    <div className="dropdown-item">Report</div>
                  </div>
                </Dropdown>
              )*/}
              {loggedIn && (
                <Dropdown target={<ButtonMore />} aligned="right">
                  <div className="dropdown-list">
                    <button className="button-clear dropdown-item" onClick={toggleCommunityMute}>
                      {muteDisplayText}
                    </button>
                  </div>
                </Dropdown>
              )}
            </div>
          </div>
          <div className="comm-main-title">
            <h1>{community.name}</h1>
            <div className="comm-main-followers">
              {stringCount(community.noMembers, false, 'member')}
            </div>
            <div className="comm-main-description">
              <ShowMoreBox showButton maxHeight="120px">
                <MarkdownBody>{community.about}</MarkdownBody>
              </ShowMoreBox>
            </div>
            <div className="comm-main-created-at">
              {`Created on ${dateString1(community.createdAt)}.`}
            </div>
          </div>
          <div className="tabs is-m">
            <button
              className={'button-clear tab-item' + (tab === 'posts' ? ' is-active' : '')}
              onClick={() => setTab('posts')}
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
        {loggedIn && <div className="comm-action-buttons-m">{renderActionButtons()}</div>}
        <div className="comm-posts">
          {tab === 'posts' && <PostsFeed communityId={community.id} />}
          {tab === 'about' && (
            <div className="comm-about">
              {renderRules()}
              {renderModeratorsList()}
            </div>
          )}
        </div>
      </main>
      <aside className="sidebar-right is-custom-scrollbar is-v2">
        {loggedIn && renderActionButtons()}
        {renderRules()}
        {renderModeratorsList()}
        <MiniFooter />
      </aside>
    </div>
  );
};

Community.propTypes = {
  name: PropTypes.string.isRequired,
};

export default Community;

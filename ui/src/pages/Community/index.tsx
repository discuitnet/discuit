import { useEffect, useState } from 'react';
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
import {
  APIError,
  copyToClipboard,
  dateString1,
  mfetch,
  mfetchjson,
  selectImageCopyURL,
  stringCount,
} from '../../helper';
import { useIsMobile, useMuteCommunity } from '../../hooks';
import { communityAdded, selectCommunity } from '../../slices/communitiesSlice';
import { MainState, snackAlert, snackAlertError } from '../../slices/mainSlice';
import { SVGEdit } from '../../SVGs';

import ImageEditModal from '../../components/ImageEditModal';
import { RootState } from '../../store';
import PostsFeed from '../../views/PostsFeed';
import NotFound from '../NotFound';
import Banner from './Banner';
import JoinButton from './JoinButton';
import Rules from './Rules';

const Community = () => {
  const { name } = useParams<{ [key: string]: string }>();

  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();

  const community = useSelector(selectCommunity(name));
  const loading = !(community && Array.isArray(community.mods) && Array.isArray(community.rules));
  const [error, setError] = useState<string | null>(null);
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
        setError((error as Error).toString());
        dispatch(snackAlertError(error));
      }
    })();
  }, [name, loading, location, dispatch, history]);

  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  const [communityPicModalOpen, setCommunityPicModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingPic, setIsDeletingPic] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);

  const isMobile = useIsMobile(true);
  const renderCommunityShareButton = () => {
    const useNavigatorShare = isMobile && Boolean(window.navigator.share);
    const handleClick = async () => {
      const url = `${window.location.origin}/${community.name}`;
      if (useNavigatorShare) {
        await navigator.share({
          title: community.name,
          url,
        });
      } else {
        let text = 'Failed to copy link to clipboard.';
        if (copyToClipboard(url)) {
          text = 'Link copied to clipboard.';
        }
        dispatch(snackAlert(text, 'pl_copied'));
      }
    };
    return (
      <button className="button-clear dropdown-item" onClick={handleClick}>
        {useNavigatorShare ? 'Share' : 'Copy URL'}
      </button>
    );
  };

  const [tab, setTab] = useState('posts');
  useEffect(() => {
    setTab('posts');
  }, [location]);

  const { toggleMute: toggleCommunityMute, displayText: muteDisplayText } = useMuteCommunity(
    community
      ? { communityId: community.id, communityName: community.name }
      : { communityId: '', communityName: '' }
  );

  if (loading) {
    if (error === 'notfound') {
      return <NotFound />;
    }
    return <PageLoading />;
  }

  const handleUploadCommunityPic = async (file: File) => {
    if (isUploadingPic) return;

    try {
      setIsUploadingPic(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await mfetch(`/api/communities/${community.id}/pro_pic`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
      } else {
        throw new APIError(res.status, await res.json());
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleDeleteCommunityPic = async () => {
    if (isDeletingPic) return;

    try {
      setIsDeletingPic(true);
      const rcomm = await mfetchjson(`/api/communities/${community.id}/pro_pic`, {
        method: 'DELETE',
      });

      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsDeletingPic(false);
    }
  };

  const handleUploadBanner = async (file: File) => {
    if (isUploadingBanner) return;

    try {
      setIsUploadingBanner(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await mfetch(`/api/communities/${community.id}/banner_image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
      } else {
        throw new APIError(res.status, await res.json());
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (isDeletingBanner) return;

    try {
      setIsDeletingBanner(true);
      const rcomm = await mfetchjson(`/api/communities/${community.id}/banner_image`, {
        method: 'DELETE',
      });

      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsDeletingBanner(false);
    }
  };

  const handleSaveAltText = async (altText: string, imageId: string) => {
    try {
      await mfetchjson(`/api/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ altText }),
      });

      dispatch(snackAlert('Alt text saved.'));
      setBannerModalOpen(false);
      setCommunityPicModalOpen(false);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleSaveCommunityPicAlt = async (altText: string) => {
    if (community.proPic) {
      const communityPicId = community.proPic.id;
      handleSaveAltText(altText, communityPicId);
      community.proPic.altText = altText;
    }
  };

  const handleSaveBannerAlt = async (altText: string) => {
    if (community.bannerImage) {
      const bannerId = community.bannerImage.id;
      handleSaveAltText(altText, bannerId);
      community.bannerImage.altText = altText;
    }
  };

  const renderRules = () => {
    if (community.rules) {
      return <Rules rules={community.rules} />;
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
    return (
      <>
        <Link to={`/new?community=${community.name}`} className={'button button-main'}>
          Create post
        </Link>
        {(community.userMod || (user && user.isAdmin)) && (
          <Link className="button" to={`/${name}/modtools`}>
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
              {(community.userMod || (user && user.isAdmin)) && (
                <button
                  className="banner-edit-button"
                  onClick={() => setBannerModalOpen(true)}
                  title="Edit banner"
                >
                  <SVGEdit />
                </button>
              )}
            </div>
            <CommunityProPic
              className="is-no-hover comm-main-profile"
              name={community.name}
              proPic={community.proPic}
              size="large"
              editable={Boolean(community.userMod || (user && user.isAdmin))}
              onEdit={() => setCommunityPicModalOpen(true)}
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
                    {renderCommunityShareButton()}
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

      <ImageEditModal
        open={communityPicModalOpen}
        onClose={() => setCommunityPicModalOpen(false)}
        title="Edit community icon"
        imageUrl={community.proPic ? selectImageCopyURL('medium', community.proPic) : undefined}
        altText={community.proPic?.altText}
        onUpload={handleUploadCommunityPic}
        onDelete={handleDeleteCommunityPic}
        onSave={handleSaveCommunityPicAlt}
        uploading={isUploadingPic}
        deleting={isDeletingPic}
      />

      <ImageEditModal
        open={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        title="Edit community banner"
        imageUrl={
          community.bannerImage ? selectImageCopyURL('medium', community.bannerImage) : undefined
        }
        altText={community.bannerImage?.altText}
        onUpload={handleUploadBanner}
        onDelete={handleDeleteBanner}
        onSave={handleSaveBannerAlt}
        uploading={isUploadingBanner}
        deleting={isDeletingBanner}
        isCircular={false}
      />
    </div>
  );
};

export default Community;

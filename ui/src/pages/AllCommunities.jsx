import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Sidebar from '../components/Sidebar';
import WelcomeBanner from '../views/WelcomeBanner';
import MiniFooter from '../components/MiniFooter';
import CommunityProPic from '../components/CommunityProPic';
import PageLoading from '../components/PageLoading';
import { mfetch, mfetchjson } from '../helper';
import { useDispatch, useSelector } from 'react-redux';
import {
  allCommunitiesUpdated,
  loginPromptToggled,
  snackAlert,
  snackAlertError,
} from '../slices/mainSlice';
import ShowMoreBox from '../components/ShowMoreBox';
import MarkdownBody from '../components/MarkdownBody';
import Link from '../components/Link';
import LoginForm from '../views/LoginForm';
import Modal from '../components/Modal';
import { ButtonClose } from '../components/Button';
import { InputWithCount, useInputMaxLength } from '../components/Input';
import { communityNameMaxLength } from '../config';
import { useInputUsername } from '../hooks';
import JoinButton from './Community/JoinButton';
import { useHistory, useLocation } from 'react-router-dom';
import Feed from '../components/Feed';
import { useInView } from 'react-intersection-observer';
import { onKeyEnter } from '../helper';

const prepareText = (isMobile = false) => {
  const x = isMobile ? 'by filling out the form below' : 'by clicking on the button below';
  return `Communities are currently available only on a per request
    basis. You can request one ${x}, and if you seem
    reasonable and trustworthy, the requested community will be created and you will
    be added as a moderator of that community.`;
};

const AllCommunities = () => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  const [searchQuery, setSearchQuery] = useState('');

  const dispatch = useDispatch();

  let { items: comms, loading } = useSelector((state) => {
    const names = state.main.allCommunities.items;
    const communities = state.communities.items;
    const items = [];
    names.forEach((name) => items.push(communities[name]));
    return {
      items: items || [],
      loading: state.main.allCommunities.loading,
    };
  });

  const handleCommunitiesSearch = async () => {
    const getApiUrl = (query) => `/api/search?q=${encodeURIComponent(query)}&index=communities`;

    if (!CONFIG.meiliEnabled) {
      return;
    }

    // Set loading to true
    loading = true;

    // Query is empty, fetch all communities
    if (searchQuery === '') {
      const res = await mfetchjson('/api/communities');
      dispatch(allCommunitiesUpdated(res));
    } else {
      try {
        const res = await mfetchjson(getApiUrl(searchQuery));
        dispatch(allCommunitiesUpdated(res.hits));
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    }

    loading = false;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await mfetchjson('/api/communities');
        dispatch(allCommunitiesUpdated(res));
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="page-content page-comms wrap page-grid">
      <Sidebar />
      <main>
        <div className="page-comms-header card card-padding">
          <h1>All communities</h1>
          {CONFIG.meiliEnabled && (
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => onKeyEnter(e, handleCommunitiesSearch)}
              onSubmit={handleCommunitiesSearch}
              className="search-input"
            />
          )}
          <RequestCommunityButton className="button-main is-m" isMobile>
            New
          </RequestCommunityButton>
        </div>
        <div className="comms-list">
          {comms.map((community) => (
            <CommItem key={community.id} itemKey={community.id}>
              <ListItem key={community.id} community={community} />
            </CommItem>
          ))}
        </div>
      </main>
      <aside className="sidebar-right">
        {!loggedIn && (
          <div className="card card-sub card-padding">
            <LoginForm />
          </div>
        )}
        <CommunityCreationCard />
        <MiniFooter />
      </aside>
    </div>
  );
};

const heights = {};

const CommItem = ({ itemKey, children }) => {
  const [ref, inView] = useInView({
    // rootMargin: '200px 0px',
    threshold: 0,
    initialInView: itemKey < 10,
  });

  const [beenInView, setBeenInView] = useState(inView);
  useEffect(() => {
    if (inView) {
      setBeenInView(true);
    }
  }, [inView]);

  const [height, setHeight] = useState(heights[itemKey] ?? 0);
  const innerRef = useCallback((node) => {
    if (node !== null && inView) {
      const child = node.firstChild;
      if (child) {
        const { height } = child.getBoundingClientRect();
        setHeight(height);
      }
    }
  });
  useEffect(() => {
    if (height > 0) {
      heights[itemKey] = height;
    }
  }, [height]);

  let h = height;
  if (h < 100) h = 100;

  return (
    <div className="comm-item" ref={ref}>
      <div ref={innerRef} style={{ height: `${h}px` }}>
        {(inView || beenInView) && children}
      </div>
    </div>
  );
};

AllCommunities.propTypes = {};

export default AllCommunities;

const CommunityCreationCard = () => {
  return (
    <div className="card card-sub card-padding home-welcome">
      <div className="home-welcome-join">New communities</div>
      <div className="home-welcome-subtext">{prepareText()}</div>
      <div className="home-welcome-buttons">
        <RequestCommunityButton className="button-main">Request a community</RequestCommunityButton>
      </div>
    </div>
  );
};

const RequestCommunityButton = ({ children, isMobile = false, ...props }) => {
  const loggedIn = useSelector((state) => state.main.user) !== null;
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const noteLength = 500;

  const [name, handleNameChange] = useInputUsername(communityNameMaxLength);
  const [note, handleNoteChange] = useInputMaxLength(noteLength);

  const handleButtonClick = () => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (name.length < 3) {
      alert('Community name has to have at least 3 characters.');
      return;
    }
    try {
      const res = await mfetch(`/api/community_requests`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          note,
        }),
      });
      if (res.ok) {
        dispatch(snackAlert('Requested!'));
        handleClose();
      } else {
        throw new Error(await res.text());
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="modal-card modal-form modal-request-comm">
          <div className="modal-card-head">
            <div className="modal-card-title">Request community</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="modal-card-content flex-column inner-gap-1">
            {isMobile && <p>{prepareText(true)}</p>}
            <InputWithCount
              value={name}
              onChange={handleNameChange}
              label="Community name"
              description="Community name cannot be changed."
              maxLength={communityNameMaxLength}
              style={{ marginBottom: '0' }}
              autoFocus
            />
            <InputWithCount
              value={note}
              onChange={handleNoteChange}
              label="Note"
              description="An optional message for the admins."
              textarea
              rows="4"
              maxLength={noteLength}
            />
            <button className="button-main" onClick={handleSubmit}>
              Request community
            </button>
          </div>
        </div>
      </Modal>
      <button onClick={handleButtonClick} {...props}>
        {children}
      </button>
    </>
  );
};

RequestCommunityButton.propTypes = {
  isMobile: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

const ListItem = ({ community }) => {
  const to = `/${community.name}`;

  const history = useHistory();
  const ref = useRef();

  const handleClick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      history.push(to);
    }
  };

  return (
    <div
      ref={ref}
      className="comms-list-item card"
      onClick={handleClick}
      style={{ minHeight: '100px' }}
    >
      <div className="comms-list-item-left">
        <CommunityProPic
          className="is-no-hover"
          name={community.name}
          proPic={community.proPic}
          size="large"
        />
      </div>
      <div className="comms-list-item-right">
        <div className="comms-list-item-name">
          <a
            href={to}
            className="link-reset comms-list-item-name-name"
            onClick={(e) => e.preventDefault()}
          >
            {community.name}
          </a>
          <JoinButton className="comms-list-item-join" community={community} />
        </div>
        <div className="comms-list-item-count">{`${community.noMembers} members`}</div>
        <div className="comms-list-item-about">
          <ShowMoreBox maxHeight="120px">
            <MarkdownBody>{community.about}</MarkdownBody>
          </ShowMoreBox>
        </div>
      </div>
    </div>
  );
};

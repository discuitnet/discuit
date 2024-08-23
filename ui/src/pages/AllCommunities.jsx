import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ButtonClose } from '../components/Button';
import CommunityProPic from '../components/CommunityProPic';
import { FormField } from '../components/Form';
import { InputWithCount, useInputMaxLength } from '../components/Input';
import MarkdownBody from '../components/MarkdownBody';
import MiniFooter from '../components/MiniFooter';
import Modal from '../components/Modal';
import PageLoading from '../components/PageLoading';
import ShowMoreBox from '../components/ShowMoreBox';
import Sidebar from '../components/Sidebar';
import { communityNameMaxLength } from '../config';
import { mfetch, mfetchjson } from '../helper';
import { useInputUsername } from '../hooks';
import {
  allCommunitiesUpdated,
  loginPromptToggled,
  snackAlert,
  snackAlertError,
} from '../slices/mainSlice';
import LoginForm from '../views/LoginForm';
import JoinButton from './Community/JoinButton';

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

  const dispatch = useDispatch();

  const { items: comms, loading } = useSelector((state) => {
    const names = state.main.allCommunities.items;
    const communities = state.communities.items;
    const items = [];
    names.forEach((name) => items.push(communities[name]));
    return {
      items: items || [],
      loading: state.main.allCommunities.loading,
    };
  });

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
          <div className="form modal-card-content flex-column inner-gap-1">
            <div className="form-field">{isMobile && <p>{prepareText(true)}</p>}</div>
            <FormField label="Community name" description="Community name cannot be changed.">
              <InputWithCount
                value={name}
                onChange={handleNameChange}
                maxLength={communityNameMaxLength}
                style={{ marginBottom: '0' }}
                autoFocus
              />
            </FormField>
            <FormField label="Note" description="An optional message for the admins.">
              <InputWithCount
                value={note}
                onChange={handleNoteChange}
                textarea
                rows="4"
                maxLength={noteLength}
              />
            </FormField>
            <FormField>
              <button className="button-main" onClick={handleSubmit} style={{ width: '100%' }}>
                Request community
              </button>
            </FormField>
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

import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mfetchjson } from '../../helper';
import { communityAdded } from '../../slices/communitiesSlice';
import { loginPromptToggled, snackAlertError } from '../../slices/mainSlice';
import ModalConfirm from '../../components/Modal/ModalConfirm';

const JoinButton = ({ className, community, ...rest }) => {
  const loggedIn = useSelector((state) => state.main.user) !== null;
  const dispatch = useDispatch();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const joined = community ? community.userJoined : false;

  const handleFollow = async () => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }

    if (community.userMod) {
      setConfirmAction(() => proceedWithFollow);
      setModalOpen(true);
      return;
    }

    proceedWithFollow();
  };

  const proceedWithFollow = async () => {
    try {
      const rcomm = await mfetchjson('/api/_joinCommunity', {
        method: 'POST',
        body: JSON.stringify({ communityId: community.id, leave: joined }),
      });
      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  let cls = joined ? '' : 'button-main';
  if (className) cls += ` ${className}`;

  return (
    <>
      <button onClick={handleFollow} className={cls} {...rest}>
        {joined ? 'Joined' : 'Join'}
      </button>
      <ModalConfirm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          setModalOpen(false);
          // if (confirm(`Leave ${community.name} and stop being a mod?`)) {
          //   confirmAction();
          // }
          confirmAction()
        }}
        title="WARNING"
        yesText="Leave"
        noText="Cancel"
        isDestructive={true}
      >
        You will no longer be a moderator of '{community.name}' if you leave this community. <br ></br><br></br>Are you sure you want to leave?
      </ModalConfirm>
    </>
  );
};

JoinButton.propTypes = {
  community: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default JoinButton;

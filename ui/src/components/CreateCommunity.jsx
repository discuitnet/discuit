import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { ButtonClose } from './Button';
import Modal from './Modal';
import { InputWithCount, useInputMaxLength } from './Input';
import { useDispatch, useSelector } from 'react-redux';
import { sidebarCommunitiesUpdated, snackAlertError } from '../slices/mainSlice';
import { mfetch, mfetchjson } from '../helper';
import { useInputUsername } from '../hooks';
import { communityAboutMaxLength, communityNameMaxLength } from '../config';

const CreateCommunity = ({ open, onClose }) => {
  const [name, handleNameChange] = useInputUsername(communityNameMaxLength);
  const [description, handleDescChange] = useInputMaxLength(communityAboutMaxLength);

  const communities = useSelector((state) => state.main.sidebarCommunities);
  const dispatch = useDispatch();

  const history = useHistory();

  const [formError, setFormError] = useState('');

  const handleCreate = async () => {
    if (name.length < 3) {
      alert('Name has to be at least 3 characters.');
      return;
    }
    try {
      const res = await mfetch('/api/communities', {
        method: 'POST',
        body: JSON.stringify({ name, about: description }),
      });
      if (res.ok) {
        const community = await res.json();
        dispatch(sidebarCommunitiesUpdated([...communities, community]));
        onClose();
        history.push(`/${name}`);
      } else if (res.status === 409) {
        setFormError('A community by that name already exists.');
      } else {
        const error = await res.json();
        if (error.code === 'not_enough_points') {
          setFormError(
            `You need at least ${CONFIG.forumCreationReqPoints} points to create a community.`
          );
        } else if (error.code === 'max_limit_reached') {
          setFormError(
            "You've reached your max limit of the number of communities you can moderate."
          );
        } else {
          throw new Error(JSON.stringify(error));
        }
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card modal-form modal-create-comm">
        <div className="modal-card-head">
          <div className="modal-card-title">Create community</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content flex-column inner-gap-1">
          <InputWithCount
            value={name}
            onChange={handleNameChange}
            label="Community name"
            description="Communiy name cannot be changed."
            maxLength={communityNameMaxLength}
            style={{ marginBottom: '0' }}
            autoFocus
          />
          <InputWithCount
            value={description}
            onChange={handleDescChange}
            label="Description"
            description="A short description to let people know what the community is all about."
            textarea
            rows="4"
            maxLength={communityAboutMaxLength}
          />
          {formError !== '' && <div className="form-error text-center">{formError}</div>}
          <button onClick={handleCreate} className="button-main">
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
};

CreateCommunity.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CreateCommunity;

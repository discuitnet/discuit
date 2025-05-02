import PropTypes from 'prop-types';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { communityAboutMaxLength, communityNameMaxLength } from '../config';
import { mfetch } from '../helper';
import { useInputUsername } from '../hooks';
import { Community } from '../serverTypes';
import { sidebarCommunitiesUpdated, snackAlertError } from '../slices/mainSlice';
import { RootState } from '../store';
import { ButtonClose } from './Button';
import { FormField } from './Form';
import { InputWithCount, useInputMaxLength } from './Input';
import Modal from './Modal';

const CreateCommunity = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [name, handleNameChange] = useInputUsername(communityNameMaxLength);
  const [description, handleDescChange] = useInputMaxLength(communityAboutMaxLength);

  const communities = useSelector<RootState>(
    (state) => state.main.sidebarCommunities
  ) as Community[];

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
            `You need at least ${import.meta.env.VITE_FORUMCREATIONREQPOINTS} points to create a community.`
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
        <div className="form modal-card-content flex-column inner-gap-1">
          <FormField label="Community name" description="Community name cannot be changed.">
            <InputWithCount
              value={name}
              onChange={handleNameChange}
              maxLength={communityNameMaxLength}
              style={{ marginBottom: '0' }}
              autoFocus
            />
          </FormField>
          <FormField
            label="Description"
            description="A short description to let people know what the community is all about."
          >
            <InputWithCount
              value={description}
              onChange={handleDescChange}
              textarea
              rows={4}
              maxLength={communityAboutMaxLength}
            />
          </FormField>
          {formError !== '' && (
            <div className="form-field">
              <div className="form-error text-center">{formError}</div>
            </div>
          )}
          <FormField>
            <button onClick={handleCreate} className="button-main" style={{ width: '100%' }}>
              Create
            </button>
          </FormField>
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

import PropTypes from 'prop-types';
//import { useState } from 'react';
//import { useDispatch, useSelector } from 'react-redux';
//import { useHistory } from 'react-router-dom';
import { messageMaxLength } from '../config';
//import { mfetch } from '../helper';
//import { sidebarCommunitiesUpdated, snackAlertError } from '../slices/mainSlice';
//import { RootState } from '../store';
import { ButtonClose } from './Button';
import { FormField } from './Form';
import { InputWithCount, useInputMaxLength } from './Input';
import Modal from './Modal';

const DenyCommunity = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  //const dispatch = useDispatch();
  //const history = useHistory();
  const [message, handleMessageChange] = useInputMaxLength(messageMaxLength);
  
  //const [formError, setFormError] = useState('');
/*
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
  };*/
  const testFunc = () => {alert("tested");}
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card modal-form">
        <div className="modal-card-head">
          <div className="modal-card-title">Send denial notification</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="form modal-card-content flex-column inner-gap-1">
          <FormField label="Message to user">
            <InputWithCount
              value={message}
              onChange={handleMessageChange}
              textarea
              maxLength={messageMaxLength}
              rows={4}
              autoFocus
            />
          </FormField>
          <FormField>
            <button onClick={testFunc} className="button-main" style={{ width: '100%' }}>
              Send
            </button>
          </FormField>
        </div>
      </div>
    </Modal>
  );
};

DenyCommunity.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DenyCommunity;

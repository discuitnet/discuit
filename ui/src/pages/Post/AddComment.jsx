import PropTypes from 'prop-types';
import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import MarkdownTextarea from '../../components/MarkdownTextarea';
import { adjustTextareaHeight, APIError, mfetch } from '../../helper';
import {
  bannedFromAdded,
  loginPromptToggled,
  snackAlert,
  snackAlertError,
} from '../../slices/mainSlice';
import AsUser from './AsUser';

const AddComment = ({
  isMod = false,
  editing = false,
  id,
  post,
  parentCommentId = null,
  onSuccess,
  onCancel,
  commentBody = '',
  main = false,
  loggedIn = true,
  disabled = false,
}) => {
  const dispatch = useDispatch();

  const [body, setBody] = useState(commentBody);
  const empty = body.length === 0;

  const postId = post.publicId;

  const [userGroup, setUserGroup] = useState('normal');

  const [clicked, setClicked] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const timer = useRef(null);

  const textareaNode = useRef();
  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setClicked(false);
    setSendingRequest(false);
    setBody('');
    if (textareaNode.current) {
      textareaNode.current.style.height = 'auto';
      textareaNode.current.blur();
    }
  };

  const handleSubmit = async () => {
    if (empty) {
      dispatch(snackAlert('Message body cannot be empty.'));
      return;
    }
    setSendingRequest(true);
    try {
      let res;
      if (editing) {
        res = await mfetch(`/api/posts/${postId}/comments/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ body: body }),
        });
      } else {
        res = await mfetch(`/api/posts/${postId}/comments?userGroup=${userGroup}`, {
          method: 'POST',
          body: JSON.stringify({
            parentCommentId,
            body,
          }),
        });
      }
      if (!res.ok) {
        if (res.status === 403) {
          const json = await res.json();
          if (json.code === 'banned_from_community') {
            alert('You are banned from this community.');
            dispatch(bannedFromAdded(post.communityId));
            return;
          }
        } else if (res.status === 429) {
          // Try again in 2 seconds.
          timer.current = setTimeout(handleSubmit, 2000);
          return;
        }
        throw new APIError(res.status, await res.json());
      }
      const comm = await res.json();
      reset();
      onSuccess(comm);
    } catch (error) {
      dispatch(snackAlertError(error));
      setSendingRequest(false);
    }
  };

  const textareaRef = useRef();
  const textareaCallbackRef = useCallback((node) => {
    if (node !== null) {
      if (!main) node.focus();
      adjustTextareaHeight({ target: node }, 4);
      textareaNode.current = node;
      textareaRef.current = node;
    }
  }, []);

  const handleTextareaClick = () => {
    if (!loggedIn) {
      textareaRef.current.blur();
      dispatch(loginPromptToggled());
      return;
    }
    if (!clicked) setClicked(true);
  };

  const handleCancel = () => {
    reset();
    if (onCancel) onCancel();
  };

  return (
    <div className={'post-comments-new' + (editing ? ' is-editing' : '')}>
      <MarkdownTextarea
        ref={textareaCallbackRef}
        name=""
        id=""
        rows="3"
        placeholder="Add a new comment"
        value={body}
        onClick={handleTextareaClick}
        disabled={disabled || sendingRequest}
        onChange={(e) => setBody(e.target.value)}
        onQuickSubmit={handleSubmit}
        onCancel={onCancel}
        onTextAmend={(value) => setBody(value)}
      />
      {(!main || (main && clicked)) && (
        <div className="post-comments-new-buttons">
          <Link className="button button-icon-simple" to="/markdown_guide" target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </Link>
          <AsUser isMod={isMod} disabled={sendingRequest} onChange={(g) => setUserGroup(g)} />
          <div className="post-comments-new-buttons-buttons">
            <button onClick={handleCancel}>Cancel</button>
            <button
              className="button-main"
              onClick={handleSubmit}
              disabled={empty || sendingRequest}
            >
              {editing ? 'Update comment' : 'Add comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AddComment.propTypes = {
  post: PropTypes.object.isRequired,
  parentCommentId: PropTypes.string,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  editing: PropTypes.bool,
  id: PropTypes.string,
  commentBody: PropTypes.string,
  main: PropTypes.bool,
  loggedIn: PropTypes.bool,
  disabled: PropTypes.bool,
  isMod: PropTypes.bool,
};

export default AddComment;

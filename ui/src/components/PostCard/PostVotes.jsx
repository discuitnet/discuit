import React from 'react';
import PropTypes from 'prop-types';
import { kRound, mfetchjson } from '../../helper';
import { useDispatch, useSelector } from 'react-redux';
import { loginPromptToggled, snackAlertError } from '../../slices/mainSlice';
import { postAdded } from '../../slices/postsSlice';
import { useVoting } from '../../hooks';

const PostVotes = ({ className = '', post, sticky = false, disabled = false, mobile = false }) => {
  const loggedIn = useSelector((state) => state.main.user) !== null;
  const dispatch = useDispatch();

  const { upvotes, downvotes, vote, doVote } = useVoting(
    post.userVoted ? (post.userVotedUp ? true : false) : null,
    post.upvotes,
    post.downvotes
  );

  const hideDownvotes = useSelector((state) => state.main.user.hideDownvotes);

  // Adjust points calculation based on hideDownvotes flag
  const points = hideDownvotes ? upvotes : upvotes - downvotes;

  const handleVote = (up = true) => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }
    if (up === false && hideDownvotes) return; // Ignore downvote clicks if downvotes are hidden

    doVote(
      up,
      async () =>
        mfetchjson('/api/_postVote', {
          method: 'POST',
          body: JSON.stringify({ postId: post.id, up }),
        }),
      (rPost) => {
        dispatch(postAdded(rPost));
      },
      (error) => {
        dispatch(snackAlertError(error));
      }
    );
  };

  // const points = upvotes - downvotes;
  const upCls = 'arrow-up' + (vote === true ? ' arrow-voted' : '');
  const downCls = vote === false ? ' arrow-voted' : '';

  if (mobile) {
    return (
      <div className="post-votes-m">
        <button
          className={'button-icon post-votes-arrow ' + upCls}
          onClick={() => handleVote()}
          disabled={disabled}
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            viewBox="0 0 512.171 512.171"
            xmlSpace="preserve"
          >
            <path
              fill="currentColor"
              d="M479.046,283.925c-1.664-3.989-5.547-6.592-9.856-6.592H352.305V10.667C352.305,4.779,347.526,0,341.638,0H170.971
			c-5.888,0-10.667,4.779-10.667,10.667v266.667H42.971c-4.309,0-8.192,2.603-9.856,6.571c-1.643,3.989-0.747,8.576,2.304,11.627
			l212.8,213.504c2.005,2.005,4.715,3.136,7.552,3.136s5.547-1.131,7.552-3.115l213.419-213.504
			C479.793,292.501,480.71,287.915,479.046,283.925z"
            />
          </svg>
        </button>
        <div
          className="post-votes-no"
          title={`Upvotes: ${post.upvotes.toLocaleString()}${
            hideDownvotes ? '' : ` • Downvotes: ${post.downvotes.toLocaleString()}`
          }`}
        >
          {kRound(points)}
        </div>
        {!hideDownvotes && (
          <button
            className={'button-icon post-votes-arrow ' + downCls}
            onClick={() => handleVote(false)}
            disabled={disabled}
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              viewBox="0 0 512.171 512.171"
              xmlSpace="preserve"
            >
              <path
                fill="currentColor"
                d="M479.046,283.925c-1.664-3.989-5.547-6.592-9.856-6.592H352.305V10.667C352.305,4.779,347.526,0,341.638,0H170.971
			c-5.888,0-10.667,4.779-10.667,10.667v266.667H42.971c-4.309,0-8.192,2.603-9.856,6.571c-1.643,3.989-0.747,8.576,2.304,11.627
			l212.8,213.504c2.005,2.005,4.715,3.136,7.552,3.136s5.547-1.131,7.552-3.115l213.419-213.504
			C479.793,292.501,480.71,287.915,479.046,283.925z"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={'post-votes' + (className === '' ? '' : ' ' + className)}>
      <div className={'post-votes-content' + (sticky ? ' is-sticky' : '')}>
        <button
          className={'button-clear post-votes-arrow ' + upCls}
          onClick={() => handleVote()}
          disabled={disabled}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.9188 8.17969H11.6888H6.07877C5.11877 8.17969 4.63877 9.33969 5.31877 10.0197L10.4988 15.1997C11.3288 16.0297 12.6788 16.0297 13.5088 15.1997L15.4788 13.2297L18.6888 10.0197C19.3588 9.33969 18.8788 8.17969 17.9188 8.17969Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <div
          className="post-votes-no"
          title={`Upvotes: ${post.upvotes.toLocaleString()}${
            hideDownvotes ? '' : ` • Downvotes: ${post.downvotes.toLocaleString()}`
          }`}
        >
          {kRound(points)}
        </div>
        {!hideDownvotes && (
          <button
            className={'button-clear post-votes-arrow ' + downCls}
            onClick={() => handleVote(false)}
            disabled={disabled}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.9188 8.17969H11.6888H6.07877C5.11877 8.17969 4.63877 9.33969 5.31877 10.0197L10.4988 15.1997C11.3288 16.0297 12.6788 16.0297 13.5088 15.1997L15.4788 13.2297L18.6888 10.0197C19.3588 9.33969 18.8788 8.17969 17.9188 8.17969Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

PostVotes.propTypes = {
  className: PropTypes.string,
  post: PropTypes.object,
  onVote: PropTypes.func,
  sticky: PropTypes.bool,
  disabled: PropTypes.bool,
  mobile: PropTypes.bool,
};

export default PostVotes;

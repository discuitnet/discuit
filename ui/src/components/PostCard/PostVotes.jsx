import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { kRound, mfetchjson } from '../../helper';
import { useVoting } from '../../hooks';
import { loginPromptToggled, snackAlertError } from '../../slices/mainSlice';
import { postAdded } from '../../slices/postsSlice';

const PostVotes = ({ className = '', post, sticky = false, disabled = false, mobile = false }) => {
  const loggedIn = useSelector((state) => state.main.user) !== null;
  const dispatch = useDispatch();

  const { upvotes, downvotes, vote, doVote } = useVoting(
    post.userVoted ? (post.userVotedUp ? true : false) : null,
    post.upvotes,
    post.downvotes
  );

  const handleVote = (up = true) => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }
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

  const points = upvotes - downvotes;
  const upCls = 'arrow-up' + (vote === true ? ' arrow-voted' : '');
  const downCls = 'arrow-down' + (vote === false ? ' arrow-voted' : '');

  if (mobile) {
    return (
      <div className="post-votes-m">
        <button
          className={'button-icon post-votes-arrow ' + upCls}
          onClick={() => handleVote()}
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="m19.707 9.293-7-7a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 5 11h3v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V11h3a1 1 0 0 0 .707-1.707z"
              fill="currentColor"
              data-name="Up"
            />
          </svg>
        </button>
        <div
          className="post-votes-no"
          title={`Upvotes: ${post.upvotes.toLocaleString()} • Downvotes: ${post.downvotes.toLocaleString()}`}
        >
          {kRound(points)}
        </div>
        <button
          className={'button-icon post-votes-arrow ' + downCls}
          onClick={() => handleVote(false)}
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="m19.707 9.293-7-7a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 5 11h3v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V11h3a1 1 0 0 0 .707-1.707z"
              fill="currentColor"
              data-name="Up"
            />
          </svg>
        </button>
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
          title={`Upvotes: ${post.upvotes.toLocaleString()} • Downvotes: ${post.downvotes.toLocaleString()}`}
        >
          {kRound(points)}
        </div>
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

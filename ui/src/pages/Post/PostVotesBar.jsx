import React from 'react';
import PropTypes from 'prop-types';
import { stringCount } from '../../helper';

const PostVotesBar = ({ up = 20000, down = 1000 }) => {
  const w = down === 0 ? 0 : (down / (up + down)) * 100;
  const u = up === 0 ? 0 : (up / (up + down)) * 100;
  const none = up + down === 0;
  const title = none
    ? 'No votes'
    : `${u.toFixed(0)}% upvoted • ${up.toLocaleString()} ${stringCount(
        up,
        true,
        'upvote'
      )} • ${down.toLocaleString()} ${stringCount(down, true, 'downvote')}`;
  return (
    <div className="post-card-votes-bar" title={title}>
      <div className={'votes-bar' + (none ? ' is-no-votes' : '')}>
        <div className="votes-bar-up"></div>
        <div className="votes-bar-down" style={{ width: `${w}%` }}></div>
      </div>
    </div>
  );
};

PostVotesBar.propTypes = {
  up: PropTypes.number.isRequired,
  down: PropTypes.number.isRequired,
};

export default PostVotesBar;

import React from 'react';

export const HelpCardCommunity = () => {
  return (
    <div className="newpost-help card-gray">
      <div className="newpost-help-title">Select a community</div>
      <p>Which community do you want to submit your post to?</p>
    </div>
  );
};

export const HelpCardBody = () => {
  return (
    <div className="newpost-help card-gray">
      <p>Write content in markdown.</p>
    </div>
  );
};

export const HelpCardTitle = () => {
  return (
    <div className="newpost-help card-gray">
      <p>No more than 255 chars.</p>
    </div>
  );
};

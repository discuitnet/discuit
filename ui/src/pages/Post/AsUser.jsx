import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const AsUser = ({ isMod, disabled = false, onChange }) => {
  const user = useSelector((state) => state.main.user);
  const isAdmin = user !== null ? user.isAdmin : false;

  const [group, setGroup] = useState('normal');
  const handleChange = (to, checked) => {
    if (checked) {
      setGroup(to);
    } else {
      setGroup('normal');
    }
  };
  useEffect(() => {
    if (onChange) onChange(group);
  }, [group]);

  if (!(isMod || isAdmin)) return null;

  return (
    <>
      {isMod && (
        <div className="checkbox">
          <input
            id="c1"
            type="checkbox"
            checked={group === 'mods'}
            onChange={(e) => handleChange('mods', e.target.checked)}
            disabled={disabled}
          />
          <label htmlFor="c1">Speaking as moderator.</label>
        </div>
      )}
      {isAdmin && (
        <div className="checkbox">
          <input
            id="c2"
            type="checkbox"
            checked={group === 'admins'}
            onChange={(e) => handleChange('admins', e.target.checked)}
            disabled={disabled}
          />
          <label htmlFor="c2">Speaking as admin.</label>
        </div>
      )}
    </>
  );
};

AsUser.propTypes = {
  isMod: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default AsUser;

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { MainState } from '../../slices/mainSlice';
import { RootState } from '../../store';

const AsUser = ({
  isMod,
  disabled = false,
  onChange,
}: {
  isMod: boolean;
  disabled?: boolean;
  onChange: (group: string) => void;
}) => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const isAdmin = user !== null ? user.isAdmin : false;

  const [group, setGroup] = useState('normal');
  const handleChange = (to: string, checked: boolean) => {
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

export default AsUser;

import React, { useState } from 'react';
import { useTheme } from '../../../hooks';
import Switch from './switch';
import { MoonIcon } from '../../svg/icons/moon';
import { SunIcon } from '../../svg/icons/sun';

export const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();

  const handleDarkModeChange = (e) => {
    const checked = e.target.checked;
    setTheme(checked ? 'light' : 'dark');
  };

  return (
    <Switch
      leftLabel={<MoonIcon />}
      rightLabel={<SunIcon />}
      checked={theme !== 'dark'}
      onChange={handleDarkModeChange}
    />
  );
};

import React from 'react';
import styles from './switch.module.scss';

const Switch = ({ leftLabel = 'Off', rightLabel = 'On', checked, onChange }) => {
  return (
    <div className={styles['switch-container']}>
      <label className={styles['switch-label']}>{leftLabel}</label>
      <label className={styles['switch']}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={styles['switch-input']}
        />
        <span className={styles['slider']} />
      </label>
      <label className={styles['switch-label']}>{rightLabel}</label>
    </div>
  );
};

export default Switch;

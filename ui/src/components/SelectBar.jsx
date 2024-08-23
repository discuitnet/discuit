import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useIsMobile } from '../hooks';
import Dropdown from './Dropdown';

const SelectBar = ({ name, options, value, onChange, ...rest }) => {
  const [id] = useState(`select-${name}-${Date.now().toString().substr(-5)}`);
  const isMobile = useIsMobile();

  const handleClick = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  if (isMobile) {
    const text = options.filter((opt) => opt.id === value)[0].text;
    return (
      <nav className="select-bar-m">
        <div className="select-bar-name">{name}</div>
        <Dropdown target={<button className="select-bar-dp-target">Sort: {text}</button>}>
          <div className="dropdown-list">
            {options.map((option) => (
              <div className="dropdown-item" key={option.id} onClick={() => handleClick(option.id)}>
                {option.text}
              </div>
            ))}
          </div>
        </Dropdown>
      </nav>
    );
  }

  const renderItem = (option) => {
    const props = {
      key: option.id,
      onClick: () => handleClick(option.id),
      className: 'button button-text select-bar-item' + (value === option.id ? ' is-selected' : ''),
    };
    if (option.to) {
      props.href = option.to;
      props.onClick = (e) => {
        e.preventDefault();
        handleClick(option.id);
      };
    }
    return React.createElement(option.to ? 'a' : 'div', props, option.text);
  };

  return (
    <nav className="select-bar" {...rest}>
      <div className="select-bar-name">{name}</div>
      <div className="select-bar-options">{options.map((option) => renderItem(option))}</div>
    </nav>
  );
};

SelectBar.propTypes = {
  name: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.array.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default SelectBar;

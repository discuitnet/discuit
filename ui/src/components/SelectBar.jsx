import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { feedLayoutChanged } from '../slices/mainSlice';
import { SVGSettings } from '../SVGs';
import Button from './Button';
import Dropdown from './Dropdown';

const layoutOptions = [
  { text: 'Card', id: 'card' },
  { text: 'Compact', id: 'compact' },
];

const SelectBar = ({ name, options, value, onChange }) => {
  const handleClick = (value) => {
    if (onChange) {
      onChange(value);
    }
  };
  const handleMouseUp = (event, value) => {
    if (event.button === 1) {
      // Third mouse button click
      window.open(`/?sort=${value}`, '_blank');
    }
  };

  const dispatch = useDispatch();
  const handleLayoutClick = (value) => {
    dispatch(feedLayoutChanged(value));
  };

  const text = options.filter((opt) => opt.id === value)[0].text;
  return (
    <nav className="select-bar">
      <div className="left">
        <div className="select-bar-name">{name}</div>
      </div>
      <div className="right">
        <Dropdown target={<button className="select-bar-dp-target">{text}</button>} aligned="right">
          <div className="dropdown-list">
            {options.map((option) => (
              <div
                className="dropdown-item"
                key={option.id}
                onClick={() => handleClick(option.id)}
                onMouseUp={(event) => handleMouseUp(event, option.id)}
              >
                {option.text}
              </div>
            ))}
          </div>
        </Dropdown>
        <Dropdown target={<Button icon={<SVGSettings />}></Button>} aligned="right">
          <div className="dropdown-list">
            {layoutOptions.map((option) => (
              <div
                className="dropdown-item"
                key={option.id}
                onClick={() => handleLayoutClick(option.id)}
              >
                {option.text}
              </div>
            ))}
          </div>
        </Dropdown>
      </div>
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

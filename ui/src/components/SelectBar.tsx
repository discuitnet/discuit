import { useDispatch } from 'react-redux';
import { feedLayoutChanged } from '../slices/mainSlice';
import { SVGSettings } from '../SVGs';
import Button from './Button';
import Dropdown from './Dropdown';

const layoutOptions = [
  { text: 'Card', id: 'card' },
  { text: 'Compact', id: 'compact' },
];

export interface SelectBarProps {
  name?: string;
  onChange?: (optionId: string) => void;
  options: ({ id: string; text: string } & unknown)[];
  value?: number | string;
}

const SelectBar = ({ name, options, value, onChange }: SelectBarProps) => {
  const handleClick = (optionId: string) => {
    if (onChange) {
      onChange(optionId);
    }
  };
  const handleMouseUp = (event: React.MouseEvent, value: string | number) => {
    if (event.button === 1) {
      // Third mouse button click.
      window.open(`/?sort=${value}`, '_blank');
    }
  };

  const dispatch = useDispatch();
  const handleLayoutClick = (value: string) => {
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

export default SelectBar;

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { adjustTextareaHeight } from '../helper';

const Textarea = ({ adjustable = false, onInput, ...props }) => {
  const ref = useCallback((node) => {
    if (node !== null && adjustable) adjustTextareaHeight({ target: node });
  }, []);
  const handleInput = (e) => {
    if (adjustable) adjustTextareaHeight(e);
    if (onInput) onInput(e);
  };
  return <textarea ref={ref} onInput={handleInput} {...props}></textarea>;
};

Textarea.propTypes = {
  adjustable: PropTypes.bool,
  onInput: PropTypes.func,
};

export default Textarea;

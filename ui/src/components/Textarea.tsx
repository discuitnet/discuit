import PropTypes from 'prop-types';
import React, { FormEvent, useCallback } from 'react';
import { adjustTextareaHeight } from '../helper';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  adjustable?: boolean;
  onInput?: React.FormEventHandler<HTMLTextAreaElement>;
}

const Textarea = ({ adjustable = false, onInput, ...props }: TextareaProps) => {
  const ref: React.RefCallback<HTMLTextAreaElement> = useCallback(
    (node) => {
      if (node !== null && adjustable) adjustTextareaHeight(node);
    },
    [adjustable]
  );
  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    if (adjustable) adjustTextareaHeight(event.target as HTMLElement);
    if (onInput) onInput(event);
  };
  return <textarea ref={ref} onInput={handleInput} {...props}></textarea>;
};

Textarea.propTypes = {
  adjustable: PropTypes.bool,
  onInput: PropTypes.func,
};

export default Textarea;

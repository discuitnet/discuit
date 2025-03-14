import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { adjustTextareaHeight, isValidHttpUrl } from '../helper';

export interface MarkdownTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoAdjustHeight: boolean;
  onQuickSubmit: () => void;
  onCancel: () => void;
}

const MarkdownTextarea = React.forwardRef<HTMLTextAreaElement, MarkdownTextareaProps>(
  function MarkdownTextarea(
    {
      autoAdjustHeight = true,
      value,
      onChange,
      onInput,
      onKeyDown,
      onPaste,
      onQuickSubmit,
      onCancel,
      ...props
    }: MarkdownTextareaProps,
    ref
  ) {
    const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
      if (onInput) onInput(event);
      if (autoAdjustHeight) {
        const textareaBorderSize = 4; // in pixels
        adjustTextareaHeight(event, textareaBorderSize);
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (onPaste) onPaste(event);
      const target = event.target as HTMLTextAreaElement;
      const selection = target.value.substring(target.selectionStart, target.selectionEnd);
      const clipboardText = event.clipboardData.getData('text');
      if (!isValidHttpUrl(clipboardText)) {
        return;
      }
      if (selection && clipboardText) {
        event.preventDefault();
        const replacement = `[${selection}](${clipboardText})`;
        /**
         * The MDN says that document.execCommand is deprecated, but it's the
         * only way, apparently, to manually edit text in a textarea without
         * breaking browser provided undo and redo. However, the function is
         * still supported by all the major browsers.
         */
        document.execCommand('insertText', false, replacement);
      }
    };

    const handleKeydown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.ctrlKey && event.key === 'Enter') {
        if (onQuickSubmit) onQuickSubmit();
      } else if (event.key === 'Escape' && value === '') {
        if (onCancel) onCancel();
      }
      if (onKeyDown) onKeyDown(event);
    };

    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current!, []);
    useEffect(() => {
      const node = innerRef.current;
      if (node && autoAdjustHeight) {
        adjustTextareaHeight(
          { target: node } as unknown as React.FormEvent<HTMLTextAreaElement>,
          4
        );
      }
    }, [autoAdjustHeight]);

    return (
      <textarea
        ref={innerRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeydown}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() =>
          innerRef.current?.setSelectionRange(
            innerRef.current.value.length,
            innerRef.current.value.length
          )
        }
        {...props}
      />
    );
  }
);

export default MarkdownTextarea;

import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { chatOpenToggled } from '../slices/mainSlice';
import { ButtonClose } from './Button';

const Chat = () => {
  const msgsRef = useRef(null);
  useEffect(() => {
    msgsRef.current.scrollTo(0, msgsRef.current.scrollHeight);
  }, []);

  const textareaRef = useRef(null);
  const handleReplyInput = () => {
    const height = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = `${height}px`;
  };

  const dispatch = useDispatch();

  return (
    <div className="chat-main">
      <div className="chat-main-title">
        <div className="chat-main-title-text">Chat</div>
        <ButtonClose onClick={() => dispatch(chatOpenToggled())} />
      </div>
      <div className="chat-main-content">
        <div className="chat-main-contacts">
          <div className="chat-main-contact">@username</div>
          <div className="chat-main-contact">@username</div>
          <div className="chat-main-contact">@username</div>
          <div className="chat-main-contact">@username</div>
          <div className="chat-main-contact">@username</div>
        </div>
        <div className="chat-main-chat">
          <div ref={msgsRef} className="chat-main-msgs">
            <div className="chat-msg">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg chat-msg-reply">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg chat-msg-reply">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg chat-msg-reply">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
            <div className="chat-msg chat-msg-reply">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </div>
          </div>
          <div className="chat-main-reply">
            <textarea
              ref={textareaRef}
              name=""
              id=""
              rows="1"
              onInput={handleReplyInput}
            ></textarea>
            <button className="button-main">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

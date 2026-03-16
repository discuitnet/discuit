import React, { useState } from 'react';
import { Community } from '../../serverTypes';
import Modal from '../../components/Modal';
import { CardForm } from './cardElement';
export interface HelpingHandProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  community: Community;
}

const HelpingHand = ({ className, community, ...rest }: HelpingHandProps) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  return (
    <>
      <button onClick={handleClick} className={className} {...rest}>
        Show Luv
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Donate to {community.name}</p>
            <button
              className="delete"
              aria-label="close"
              onClick={() => setOpen(false)}
            />
          </header>
          <section className="modal-card-body">
            <CardForm clientSecret="" />
          </section>
        </div>
      </Modal>
    </>
  );
};

export default HelpingHand;
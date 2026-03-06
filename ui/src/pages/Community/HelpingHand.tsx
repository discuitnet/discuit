import React, { useState } from 'react';
import { Community } from '../../serverTypes';
import Modal from '../../components/Modal';

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
        Helping Hand
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Show Luv</p>
            <button
              className="delete"
              aria-label="close"
              onClick={() => setOpen(false)}
            />
          </header>
          <section className="modal-card-body">
            {/* you can customize the content below */}
            <p>Donate to this community!</p>
          </section>
          <footer className="modal-card-foot">
            <button className="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default HelpingHand;
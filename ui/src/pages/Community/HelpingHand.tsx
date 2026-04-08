import React, { useState } from 'react';
import { Community } from '../../serverTypes';
import Modal from '../../components/Modal';
import { mfetchjson } from '../../helper';
import { CardForm } from './cardElement';

export interface HelpingHandProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  community: Community;
}

const HelpingHand = ({ className, community, ...rest }: HelpingHandProps) => {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    console.log("Button clicked");
    try {
      setLoading(true);
      const res = await mfetchjson<{ clientSecret: string }>(
        '/api/donations/create-payment-intent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // you can add amount etc. later
        }
      );
      setClientSecret(res.clientSecret);
      setOpen(true);
    } catch (err) {
      console.error('Failed to create payment intent', err);
      alert("Payment intent failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setClientSecret(null);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={className}
        disabled={loading}
        {...rest}
      >
        {loading ? 'Loading...' : 'Show Luv'}
      </button>

      <Modal open={open} onClose={handleClose}>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Donate to {community.name}</p>
            <button
              className="delete"
              aria-label="close"
              onClick={handleClose}
            />
          </header>
          <section className="modal-card-body">
            {clientSecret ? (
              <CardForm clientSecret={clientSecret} />
            ) : (
              <p>Loading payment form…</p>
            )}
          </section>
        </div>
      </Modal>
    </>
  );
};

export default HelpingHand;
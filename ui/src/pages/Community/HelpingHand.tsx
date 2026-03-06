import React, { useState } from 'react';
import { Community } from '../../serverTypes';
import Modal from '../../components/Modal';
import { useDispatch } from 'react-redux';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import { mfetchjson } from '../../helper';

export interface HelpingHandProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  community: Community;
}

const HelpingHand = ({ className, community, ...rest }: HelpingHandProps) => {
  const [open, setOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const dispatch = useDispatch();

  const handleClick = () => {
    setOpen(true);
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      dispatch(snackAlertError('Please enter a valid donation amount'));
      return;
    }

    if (!email) {
      dispatch(snackAlertError('Please enter your email address'));
      return;
    }

    try {
      setIsProcessing(true);

      // Call your backend to create a payment intent
      const response = await mfetchjson('/api/donations/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(parseFloat(donationAmount) * 100), // Convert to cents
          email,
          communityId: community.id,
        }),
      });

      // For now, show success and redirect. In production, handle Stripe checkout.
      setPaymentSuccess(true);
      dispatch(snackAlert('Donation successful! Thank you for supporting this community.'));

      setTimeout(() => {
        setOpen(false);
        setPaymentSuccess(false);
        setDonationAmount('');
        setEmail('');
      }, 2000);
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsProcessing(false);
    }
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
              disabled={isProcessing}
            />
          </header>
          <section className="modal-card-body">
            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'green' }}>
                  ✓ Thank you for your donation!
                </p>
                <p>Your support helps keep this community thriving.</p>
              </div>
            ) : (
              <form onSubmit={handleDonationSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      boxSizing: 'border-box',
                    }}
                    disabled={isProcessing}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="amount" style={{ display: 'block', marginBottom: '5px' }}>
                    Donation Amount ($)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    placeholder="10.00"
                    step="0.01"
                    min="0.50"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      boxSizing: 'border-box',
                    }}
                    disabled={isProcessing}
                  />
                </div>

                <p style={{ fontSize: '14px', color: '#666' }}>
                  Your donation will be processed securely via Stripe.
                </p>
              </form>
            )}
          </section>
          <footer className="modal-card-foot">
            {!paymentSuccess && (
              <button
                className="button button-main"
                onClick={handleDonationSubmit}
                disabled={isProcessing || !donationAmount || !email}
              >
                {isProcessing ? 'Processing...' : 'Donate'}
              </button>
            )}
            <button
              className="button"
              onClick={() => setOpen(false)}
              disabled={isProcessing}
            >
              {paymentSuccess ? 'Close' : 'Cancel'}
            </button>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default HelpingHand;
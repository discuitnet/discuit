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
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // remember the values that were submitted so we can show a recap after
  // the request succeeds; reset when the user explicitly closes the modal.
  const [lastDonation, setLastDonation] = useState('');
  const [lastEmail, setLastEmail] = useState('');
  const dispatch = useDispatch();

  const handleClick = () => {
    setOpen(true);
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // immediately show confirmation dialog; we'll still perform validation and
    // the network request, but opening early avoids a blink if the call is fast.
    setConfirmationOpen(true);

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
      await mfetchjson('/api/donations/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(parseFloat(donationAmount) * 100), // Convert to cents
          email,
          communityId: community.id,
        }),
      });

      // For now, show success and redirect. In production, handle Stripe checkout.
      setLastDonation(donationAmount);
      setLastEmail(email);
      dispatch(snackAlert('Donation successful! Thank you for supporting this community.'));

      // close the entry modal and show a separate confirmation dialog
      setOpen(false);
      setConfirmationOpen(true);
      // reset form fields for next time
      setDonationAmount('');
      setEmail('');
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
            <form onSubmit={handleDonationSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #800000',
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
                  placeholder="Enter Amount"
                  step="0.01"
                  min="0.50"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #800000',
                    boxSizing: 'border-box',
                  }}
                  disabled={isProcessing}
                />
              </div>

              <p style={{ fontSize: '14px', color: '#666' }}>
                Your donation will be processed securely via Stripe.
              </p>
            </form>
          </section>
          <footer className="modal-card-foot">
            <button
              className="button button-main"
              onClick={handleDonationSubmit}
              disabled={isProcessing || !donationAmount || !email}
            >
              {isProcessing ? 'Processing...' : 'Donate'}
            </button>
            <button
              className="button"
              onClick={() => setOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </button>
          </footer>
        </div>
      </Modal>
      {/* confirmation dialog shown after the form closes */}
      <Modal open={confirmationOpen} onClose={() => setConfirmationOpen(false)}>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Donation received</p>
            <button
              className="delete"
              aria-label="close"
              onClick={() => setConfirmationOpen(false)}
            />
          </header>
          <section className="modal-card-body" style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'green' }}>
              ✓ Thank you for your donation!
            </p>
            <p>Your support helps keep this community thriving.</p>
            <p>
              <strong>Amount:</strong> ${parseFloat(lastDonation).toFixed(2)}
            </p>
            <p>
              <strong>Receipt:</strong> {lastEmail}
            </p>
          </section>
          <footer className="modal-card-foot">
            <button
              className="button"
              onClick={() => {
                setConfirmationOpen(false);
                // clear recap values when dismissed
                setLastDonation('');
                setLastEmail('');
              }}
            >
              Close
            </button>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default HelpingHand;
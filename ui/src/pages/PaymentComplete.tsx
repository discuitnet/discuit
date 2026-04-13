// src/pages/PaymentComplete.tsx
import { useEffect } from 'react';

const PaymentComplete = () => {
  useEffect(() => {
    // Optionally, you can fetch payment details here if needed.
    // For example, fetch payment status or display a confirmation message.
    console.log('Payment was successful!');
  }, []);

  return (
    <div>
      <h1>Thank you for your donation!</h1>
      <p>Your donation has been successfully processed.</p>
    </div>
  );
};

export default PaymentComplete;
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

const stripePromise = loadStripe('pk_test_51TBLlcAc1nzqw1af9VTz5otuOhETdVat3E9XFSoF8h4GVBOKpzev5raMfRj3gyuJ4byIoTycovoLTbdpm3NlCe0o00tWMvYdaC');

// Type for CardForm props
type CardFormProps = {
  clientSecret: string;
  amount: number; // Add the amount prop here
};

// The CardForm component renders the Elements provider and passes clientSecret to CheckoutForm
export const CardForm = ({ clientSecret, amount }: CardFormProps) => (
  <Elements stripe={stripePromise} options={{ clientSecret }}>
    <CheckoutForm amount={amount} /> {/* Pass amount to CheckoutForm */}
  </Elements>
);

// The CheckoutForm component where you handle the payment and display the donation amount
const CheckoutForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false); // Manage loading state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true); // Start processing payment

    try {
      // Use the current origin so Stripe always redirects to the correct frontend route.
      // This ensures the user lands on /payment-complete, which is handled by the React app.
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
      });

      if (error) {
        console.error("Payment failed:", error.message);
        // Optionally show error to user
      }
    } catch (err) {
      console.error("An error occurred during payment processing", err);
    } finally {
      setIsProcessing(false); // Stop processing
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Display the amount dynamically in the modal */}
      <div>
        <h3>Donation Amount: ${amount / 100}</h3> {/* Assuming amount is in cents, so divide by 100 */}
      </div>

      <PaymentElement />
      <button type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? "Processing..." : "Donate"}
      </button>
    </form>
  );
};

/*
//import React from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51TCN4f8umO8gBqTlmIu4kZb6bfin7XHV8zUC5fsBZRSwRmGdRnU8KBV8bwjBvXyRtpgDr1p2eC8pdPUwvkG0gOKy00ZPbWHMKF');




type CardFormProps = {
  clientSecret: string;
};

export const CardForm = ({ clientSecret }: CardFormProps) => (
  <Elements stripe={stripePromise} options={{ clientSecret }}>
    < CheckoutForm/>
  </Elements>
);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "http://localhost:8080/payment-complete",
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Donate</button>
    </form>
  );
};
*/
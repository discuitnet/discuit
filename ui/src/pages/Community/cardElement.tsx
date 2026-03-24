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
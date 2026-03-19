//import React from 'react';
import { Elements, PaymentElement} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51TCN4f8umO8gBqTlmIu4kZb6bfin7XHV8zUC5fsBZRSwRmGdRnU8KBV8bwjBvXyRtpgDr1p2eC8pdPUwvkG0gOKy00ZPbWHMKF');

type CardFormProps = {
  clientSecret: string;
};

export const CardForm = ({ clientSecret }: CardFormProps) => (
  <Elements stripe={stripePromise} options={{ clientSecret }}>
    <PaymentElement />
  </Elements>
);
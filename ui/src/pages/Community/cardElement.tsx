//import React from 'react';
import {Elements, CardElement} from '@stripe/react-stripe-js';
import {loadStripe} from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
//need to declare type of prop because it's typescript
type CardFormProps = {
  clientSecret: string;
};
export const CardForm = ({clientSecret}: CardFormProps) => (
  <Elements stripe={stripePromise} options={{clientSecret}}>
    <CardElement />
  </Elements>
);
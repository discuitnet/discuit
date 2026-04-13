package server

import (
	"net/http"
	"os"

	"github.com/discuitnet/discuit/internal/httperr"
	//stripe
	"github.com/stripe/stripe-go/v83"
	"github.com/stripe/stripe-go/v83/paymentintent"
)

type createDonationPaymentIntentRequest struct {
	Amount int64 `json:"amount"` // optional, cents
}

type createDonationPaymentIntentResponse struct {
	ClientSecret string `json:"clientSecret"`
}

// /api/donations/create-payment-intent [POST]
func (s *Server) createDonationPaymentIntent(w *responseWriter, r *request) error {
	secret := os.Getenv("STRIPE_SECRET_KEY")
	if secret == "" {
		return &httperr.Error{
			HTTPStatus: http.StatusInternalServerError,
			Code:       "stripe_not_configured",
			Message:    "Stripe secret key not configured.",
		}
	}
	stripe.Key = secret

	var body createDonationPaymentIntentRequest
	_ = r.unmarshalJSONBody(&body)

	amount := body.Amount
	if amount <= 0 {
		amount = 500 // default: $5.00
	}

	pi, err := paymentintent.New(&stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amount),
		Currency: stripe.String("usd"),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
	})
	if err != nil {
		return err
	}

	return w.writeJSON(createDonationPaymentIntentResponse{
		ClientSecret: pi.ClientSecret,
	})
}

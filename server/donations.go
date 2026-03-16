package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/stripe/stripe-go/v72"
	stripecheckout "github.com/stripe/stripe-go/v72/checkout/session"
	"github.com/stripe/stripe-go/v72/paymentintent"
	"github.com/stripe/stripe-go/v72/webhook"

	"github.com/discuitnet/discuit/internal/httperr"
)

// createPaymentIntent creates a Stripe PaymentIntent and returns the
// client secret. The frontend can use this secret to complete the checkout
// via Stripe.js.
//
// Expects JSON body with the fields:
//   amount   float64 (cents)
//   email    string
//   communityId float64 (optional)
func (s *Server) createPaymentIntent(w *responseWriter, r *request) error {
	reqBody, err := r.unmarshalJSONBodyToMap()
	if err != nil {
		return err
	}

	amt, ok := reqBody["amount"].(float64) // amount in cents
	if !ok || amt <= 0 {
		return httperr.NewBadRequest("invalid_amount", "Amount must be >0")
	}
	email, ok := reqBody["email"].(string)
	if !ok || email == "" {
		return httperr.NewBadRequest("missing_email", "Email required")
	}
	commID, _ := reqBody["communityId"].(float64)

	// set stripe key from config
	stripe.Key = s.config.StripeSecretKey

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(amt)),
		Currency: stripe.String(string(stripe.CurrencyUSD)),
		ReceiptEmail: stripe.String(email),
	}
	// you can add metadata via params.AddMetadata("community_id", fmt.Sprintf("%.0f", commID))
	if commID != 0 {
		params.AddMetadata("community_id", fmt.Sprintf("%.0f", commID))
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return err
	}

	return w.writeJSON(struct {
		ClientSecret string `json:"clientSecret"`
	}{pi.ClientSecret})
}

// createCheckoutSession creates a Stripe Checkout Session and returns the
// URL where the user should be redirected. The front-end can simply
// navigate the browser to this URL and Stripe will display a hosted checkout
// page.
//
// Expects JSON body with the fields:
//   amount   float64 (cents)
//   email    string
//   communityId float64 (optional)
func (s *Server) createCheckoutSession(w *responseWriter, r *request) error {
	reqBody, err := r.unmarshalJSONBodyToMap()
	if err != nil {
		return err
	}

	amt, ok := reqBody["amount"].(float64) // amount in cents
	if !ok || amt <= 0 {
		return httperr.NewBadRequest("invalid_amount", "Amount must be >0")
	}
	email, ok := reqBody["email"].(string)
	if !ok || email == "" {
		return httperr.NewBadRequest("missing_email", "Email required")
	}
	commID, _ := reqBody["communityId"].(float64)

	stripe.Key = s.config.StripeSecretKey

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(string(stripe.CurrencyUSD)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("Donation to " + s.config.SiteName),
					},
					UnitAmount: stripe.Int64(int64(amt)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(s.config.Addr + "/?donation=success"),
		CancelURL:  stripe.String(s.config.Addr + "/?donation=cancel"),
		CustomerEmail: stripe.String(email),
	}
	if commID != 0 {
		params.AddMetadata("community_id", fmt.Sprintf("%.0f", commID))
	}

	sess, err := stripecheckout.New(params)
	if err != nil {
		return err
	}

	return w.writeJSON(struct {
		URL string `json:"url"`
	}{sess.URL})
}

// handleStripeWebhook verifies Stripe webhook signature and handles a
// couple of events. You'll want to extend this with whatever business
// logic (storing the donation, sending receipts, etc.) you need.

func (s *Server) handleStripeWebhook(w *responseWriter, r *request) error {
	payload, err := io.ReadAll(r.req.Body)
	if err != nil {
		return err
	}
	sig := r.req.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sig, s.config.StripeWebhookSecret)
	if err != nil {
		return httperr.NewBadRequest("webhook_signature", "invalid signature")
	}

	switch event.Type {
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err == nil {
			// TODO: record donation, send acknowledgement, etc.
			_ = pi
		}
	case "payment_intent.payment_failed":
		// optionally handle failure
	}

	w.WriteHeader(http.StatusOK)
	return nil
}

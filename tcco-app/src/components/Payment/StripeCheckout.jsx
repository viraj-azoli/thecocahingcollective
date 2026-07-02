import React, { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import './Payment.css';

export default function StripeCheckout({ tier, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pricing = {
    Discovery: { amount: 9.99, priceId: process.env.REACT_APP_STRIPE_DISCOVERY_PRICE_ID },
    Connection: { amount: 197.00, priceId: process.env.REACT_APP_STRIPE_CONNECTION_PRICE_ID },
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In production, this would call a backend endpoint to create a Stripe Checkout session
      // For now, we'll simulate the subscription creation
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          seeker_id: user.id,
          tier: tier,
          status: 'active',
          auto_renew: true,
        }]);

      if (subscriptionError) throw subscriptionError;

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const price = pricing[tier];

  return (
    <div className="checkout-container">
      <div className="checkout-card">
        <h2>Complete Your {tier} Subscription</h2>
        <p className="checkout-subtitle">Secure payment powered by Stripe</p>

        <div className="order-summary">
          <div className="summary-item">
            <span>{tier} Tier - Monthly</span>
            <span className="price">${price.amount}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-total">
            <span>Total</span>
            <span className="total-price">${price.amount}/month</span>
          </div>
        </div>

        <form onSubmit={handleCheckout} className="checkout-form">
          <div className="form-group">
            <label htmlFor="cardName">Cardholder Name</label>
            <input
              id="cardName"
              type="text"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cardEmail">Email</label>
            <input
              id="cardEmail"
              type="email"
              placeholder={user?.email || 'your@email.com'}
              defaultValue={user?.email}
              required
            />
          </div>

          <div className="card-element-placeholder">
            <div className="card-placeholder">
              <span>💳</span>
              <p>Card Number</p>
              <small>This is a demo. Use test card: 4242 4242 4242 4242</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiry">Expiry Date</label>
              <input
                id="expiry"
                type="text"
                placeholder="MM/YY"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cvc">CVC</label>
              <input
                id="cvc"
                type="text"
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="terms">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to the terms and auto-renewal of my subscription
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-checkout"
          >
            {loading ? 'Processing...' : `Subscribe - $${price.amount}/month`}
          </button>

          <p className="security-note">🔒 Your payment is secure and encrypted</p>
        </form>
      </div>
    </div>
  );
}

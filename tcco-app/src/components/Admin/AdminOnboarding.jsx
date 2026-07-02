import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import './AdminOnboarding.css';

export default function AdminOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompleteSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create admin user record
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert([{
          user_id: user.id,
          role: 'super_admin',
          permissions: ['manage_coaches', 'manage_seekers', 'view_analytics', 'moderate_content'],
        }]);

      if (adminError) throw adminError;

      setTimeout(() => navigate('/admin/dashboard'), 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-onboarding-container">
      <div className="admin-onboarding-card">
        <div className="admin-header">
          <h1>🛡️ Admin Dashboard Setup</h1>
          <p>You have admin privileges. Set up your admin dashboard to manage the platform.</p>
        </div>

        <div className="admin-features">
          <div className="feature">
            <div className="feature-icon">👥</div>
            <h3>Manage Coaches</h3>
            <p>Verify coaches, view profiles, and manage verification status</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🔍</div>
            <h3>Moderation</h3>
            <p>Review content, handle reports, and ensure community standards</p>
          </div>

          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>View platform metrics, user activity, and revenue data</p>
          </div>

          <div className="feature">
            <div className="feature-icon">⚙️</div>
            <h3>Settings</h3>
            <p>Configure platform settings, pricing, and policies</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          onClick={handleCompleteSetup}
          disabled={loading}
          className="admin-button"
        >
          {loading ? 'Setting up...' : 'Go to Admin Dashboard'}
        </button>
      </div>
    </div>
  );
}

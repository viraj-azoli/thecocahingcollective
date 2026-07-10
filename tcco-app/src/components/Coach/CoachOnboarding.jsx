import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useCoachOnboarding } from '../../hooks/useCoachOnboarding';
import { showToast } from '../shared/Toast';
import './CoachOnboarding.css';

export default function CoachOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    profileData,
    updateField,
    updateSpecialties,
    updateSessionTypes,
    currentStep,
    setCurrentStep,
    saveProfile,
    loading,
    error,
    validateStep,
    COACH_SPECIALTIES,
    SESSION_TYPES,
  } = useCoachOnboarding(user?.id);

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      showToast('Please fill in all required fields', 'error');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await saveProfile();
      setCurrentStep(4); // Success step
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      showToast('Failed to save profile. Please try again.', 'error');
    }
  };

  return (
    <div className="coach-onboarding-container">
      <div className="coach-onboarding-progress">
        {[0, 1, 2, 3].map(step => (
          <div
            key={step}
            className={`progress-dot ${
              step < currentStep ? 'completed' : step === currentStep ? 'active' : ''
            }`}
          />
        ))}
      </div>

      <div className="coach-onboarding-content">
        {/* Step 0: Basic Info */}
        {currentStep === 0 && (
          <>
            <h1>Let's set up your coach profile</h1>
            <p className="subtitle">Step 1 of 4: Your Basic Information</p>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="name">Your Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Full name"
                  value={profileData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Professional Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Executive Coach, Life Coach, Wellness Coach"
                  value={profileData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 1: About You */}
        {currentStep === 1 && (
          <>
            <h1>Tell us about yourself</h1>
            <p className="subtitle">Step 2 of 4: Your Expertise</p>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="bio">Your Bio *</label>
                <textarea
                  id="bio"
                  placeholder="Share your background, approach, and what makes you unique as a coach"
                  value={profileData.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="form-group">
                <label>Areas of Specialization *</label>
                <p className="field-hint">Select at least one area</p>
                <div className="checkbox-grid">
                  {COACH_SPECIALTIES.map(specialty => (
                    <label key={specialty.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={profileData.specialties.includes(specialty.value)}
                        onChange={() => updateSpecialties(specialty.value)}
                      />
                      <span>{specialty.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Services & Pricing */}
        {currentStep === 2 && (
          <>
            <h1>Your services and pricing</h1>
            <p className="subtitle">Step 3 of 4: How You Offer Coaching</p>

            <div className="form-section">
              <div className="form-group">
                <label>Session Types *</label>
                <p className="field-hint">Select all that apply</p>
                <div className="checkbox-grid">
                  {SESSION_TYPES.map(type => (
                    <label key={type.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={profileData.session_types.includes(type.value)}
                        onChange={() => updateSessionTypes(type.value)}
                      />
                      <span>{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="price">Price per Session (USD) *</label>
                <div className="price-input-wrapper">
                  <span className="currency">$</span>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 100"
                    value={profileData.price_per_session}
                    onChange={(e) => updateField('price_per_session', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <>
            <h1>Review your profile</h1>
            <p className="subtitle">Step 4 of 4: Confirm Your Information</p>

            <div className="review-section">
              <div className="review-item">
                <h3>Name & Title</h3>
                <p>{profileData.name} - {profileData.title}</p>
              </div>

              <div className="review-item">
                <h3>Bio</h3>
                <p>{profileData.bio}</p>
              </div>

              <div className="review-item">
                <h3>Specializations</h3>
                <div className="review-tags">
                  {profileData.specialties.map(spec => (
                    <span key={spec} className="tag">
                      {COACH_SPECIALTIES.find(s => s.value === spec)?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="review-item">
                <h3>Session Types</h3>
                <div className="review-tags">
                  {profileData.session_types.map(type => (
                    <span key={type} className="tag">
                      {SESSION_TYPES.find(s => s.value === type)?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="review-item">
                <h3>Price per Session</h3>
                <p className="price-display">${parseFloat(profileData.price_per_session).toFixed(2)}</p>
              </div>
            </div>

            <div className="info-box">
              <h4>📝 Next Steps</h4>
              <p>After setup, you'll connect your Stripe account for payments and set your availability calendar.</p>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h1>Welcome to The Coaching Collective!</h1>
            <p>Your coach profile is ready. Let's get you set up with payments.</p>
            <p className="redirect-message">Redirecting to your dashboard...</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="button-group">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="button secondary"
            >
              Back
            </button>
            <button
              onClick={currentStep === 3 ? handleComplete : handleNext}
              disabled={loading}
              className="button primary"
            >
              {loading ? 'Saving...' : currentStep === 3 ? 'Complete Setup' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

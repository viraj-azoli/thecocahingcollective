import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useSeekerOnboarding } from '../../hooks/useSeekerOnboarding';
import './SeekerOnboarding.css';

export default function SeekerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('quiz'); // 'quiz', 'tier-select', 'complete'
  const [displayName, setDisplayName] = useState('');
  const {
    quizAnswers,
    updateQuizAnswer,
    recommendTier,
    selectedTier,
    setSelectedTier,
    saveProfile,
    loading,
    error,
    QUIZ_OPTIONS,
  } = useSeekerOnboarding(user?.id);

  const handleQuizComplete = () => {
    if (
      !quizAnswers.brings_you_here ||
      !quizAnswers.preferred_format ||
      !quizAnswers.coaching_experience
    ) {
      alert('Please answer all questions');
      return;
    }

    const recommended = recommendTier(quizAnswers);
    setSelectedTier(recommended);
    setStep('tier-select');
  };

  const handleTierSelect = async () => {
    if (!selectedTier) {
      alert('Please select a tier');
      return;
    }

    try {
      await saveProfile({
        name: displayName || user?.email?.split('@')[0] || 'Seeker',
      });
      setStep('complete');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress">
        <div className={`progress-step ${step !== 'quiz' ? 'completed' : 'active'}`}>
          1. About You
        </div>
        <div className={`progress-step ${step === 'complete' ? 'completed' : step === 'tier-select' ? 'active' : ''}`}>
          2. Choose Plan
        </div>
      </div>

      {step === 'quiz' && (
        <div className="onboarding-content">
          <h1>Let's find your perfect fit</h1>
          <p className="subtitle">Just 3 quick questions to get started</p>

          <div className="quiz-section">
            <div className="quiz-question">
              <h2>What brings you here today?</h2>
              <p className="question-subtitle">Select what's most important for you</p>
              <div className="options-grid">
                {QUIZ_OPTIONS.brings_you_here.map(opt => (
                  <label key={opt.value} className="option-label">
                    <input
                      type="radio"
                      name="brings_you_here"
                      value={opt.value}
                      checked={quizAnswers.brings_you_here === opt.value}
                      onChange={() => updateQuizAnswer('brings_you_here', opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="quiz-question">
              <h2>What's your preferred coaching format?</h2>
              <p className="question-subtitle">How do you learn best?</p>
              <div className="options-grid">
                {QUIZ_OPTIONS.preferred_format.map(opt => (
                  <label key={opt.value} className="option-label">
                    <input
                      type="radio"
                      name="preferred_format"
                      value={opt.value}
                      checked={quizAnswers.preferred_format === opt.value}
                      onChange={() => updateQuizAnswer('preferred_format', opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="quiz-question">
              <h2>Have you worked with a coach before?</h2>
              <p className="question-subtitle">This helps us tailor your experience</p>
              <div className="options-grid">
                {QUIZ_OPTIONS.coaching_experience.map(opt => (
                  <label key={opt.value} className="option-label">
                    <input
                      type="radio"
                      name="coaching_experience"
                      value={opt.value}
                      checked={quizAnswers.coaching_experience === opt.value}
                      onChange={() => updateQuizAnswer('coaching_experience', opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleQuizComplete} className="onboarding-button primary">
            Next: Choose your plan
          </button>
        </div>
      )}

      {step === 'tier-select' && (
        <div className="onboarding-content">
          <h1>Choose your plan</h1>
          <p className="subtitle">
            Based on your answers, we recommend the {selectedTier} tier
          </p>

          <div className="tier-selection">
            <div
              className={`tier-card ${selectedTier === 'Discovery' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('Discovery')}
            >
              <h3>Discovery</h3>
              <div className="tier-price">$9.99<span>/month</span></div>
              <ul className="tier-features">
                <li>✓ Coaching library access</li>
                <li>✓ Daily journal prompts</li>
                <li>✓ Mood tracking</li>
                <li>✓ Email support</li>
                <li>✗ 1-on-1 coaching sessions</li>
              </ul>
              <button
                className={`tier-button ${selectedTier === 'Discovery' ? 'active' : ''}`}
              >
                {selectedTier === 'Discovery' ? '✓ Selected' : 'Select'}
              </button>
            </div>

            <div
              className={`tier-card ${selectedTier === 'Connection' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('Connection')}
            >
              <div className="tier-badge">Recommended for experienced seekers</div>
              <h3>Connection</h3>
              <div className="tier-price">$197<span>/month</span></div>
              <ul className="tier-features">
                <li>✓ Everything in Discovery</li>
                <li>✓ 1 monthly 1-on-1 session</li>
                <li>✓ Priority support</li>
                <li>✓ Personalized coaching plan</li>
                <li>✓ Direct coach communication</li>
              </ul>
              <button
                className={`tier-button ${selectedTier === 'Connection' ? 'active' : ''}`}
              >
                {selectedTier === 'Connection' ? '✓ Selected' : 'Select'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              placeholder="How should coaches know you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="button-group">
            <button onClick={() => setStep('quiz')} className="onboarding-button secondary">
              Back
            </button>
            <button
              onClick={handleTierSelect}
              disabled={loading}
              className="onboarding-button primary"
            >
              {loading ? 'Setting up...' : 'Continue to payment'}
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>
      )}

      {step === 'complete' && (
        <div className="onboarding-content complete">
          <div className="success-icon">✓</div>
          <h1>Welcome to The Coaching Collective!</h1>
          <p>Your account is all set up. Get ready to start your coaching journey.</p>
          <p className="redirect-message">Redirecting to your dashboard...</p>
        </div>
      )}
    </div>
  );
}

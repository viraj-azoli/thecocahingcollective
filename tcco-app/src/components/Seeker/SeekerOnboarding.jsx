import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useSeekerOnboarding } from '../../hooks/useSeekerOnboarding';
import { showToast } from '../shared/Toast';
import { ToastContainer } from '../shared/Toast';
import './SeekerOnboarding.css';

export default function SeekerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('quiz'); // 'quiz', 'complete'
  const [displayName, setDisplayName] = useState('');
  const {
    quizAnswers,
    updateQuizAnswer,
    setSelectedTier,
    saveProfile,
    loading,
    error,
    QUIZ_OPTIONS,
  } = useSeekerOnboarding(user?.id);

  const handleComplete = async () => {
    if (
      !quizAnswers.brings_you_here ||
      !quizAnswers.preferred_format ||
      !quizAnswers.coaching_experience
    ) {
      showToast('Please answer all questions', 'error');
      return;
    }
    if (!displayName.trim()) {
      showToast('Please enter a display name', 'error');
      return;
    }

    try {
      // Default to Discovery tier (which is our free seeker plan).
      // Pass the tier directly — setSelectedTier is async and wouldn't be
      // reflected in the immediate saveProfile call.
      setSelectedTier('Discovery');
      await saveProfile({
        name: displayName.trim(),
        tier: 'Discovery',
      });
      setStep('complete');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  return (
    <div className="onboarding-container">
      <ToastContainer />
      {step === 'quiz' && (
        <div className="onboarding-content">
          <h1>Let's find your perfect fit</h1>
          <p className="subtitle">Just a few quick questions to get started</p>

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

            {/* Display Name Input */}
            <div className="quiz-question">
              <h2>Your Name</h2>
              <p className="question-subtitle">How should coaches address you?</p>
              <div className="form-group" style={{ width: '100%' }}>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1.5px solid var(--gray-300)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          <button onClick={handleComplete} disabled={loading} className="onboarding-button primary">
            {loading ? 'Setting up...' : 'Complete setup'}
          </button>

          {error && <p className="error-message" style={{ marginTop: '16px', color: '#EF4444' }}>{error}</p>}
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

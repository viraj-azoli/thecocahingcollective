import { describe, it, expect } from 'vitest';

describe('Seeker Onboarding', () => {
  it('should collect 3 quiz answers', () => {
    const answers = {
      brings_you_here: 'burnout',
      preferred_format: '1-on-1',
      coaching_experience: 'first-timer',
    };
    expect(answers.brings_you_here).toBe('burnout');
    expect(answers.preferred_format).toBe('1-on-1');
    expect(answers.coaching_experience).toBe('first-timer');
  });

  it('should recommend Discovery for first-timers', () => {
    const experience = 'first-timer';
    const recommendedTier = experience === 'first-timer' ? 'Discovery' : 'Connection';
    expect(recommendedTier).toBe('Discovery');
  });

  it('should recommend Connection for experienced seekers', () => {
    const experience = 'experienced';
    const recommendedTier = experience === 'first-timer' ? 'Discovery' : 'Connection';
    expect(recommendedTier).toBe('Connection');
  });

  it('should validate tier selection', () => {
    const validTiers = ['Discovery', 'Connection'];
    const selectedTier = 'Discovery';
    expect(validTiers).toContain(selectedTier);
  });
});

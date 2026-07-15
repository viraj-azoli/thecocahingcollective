// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachOnboarding } from '../src/hooks/useCoachOnboarding';

describe('useCoachOnboarding', () => {
  it('toggling a specialty preserves the rest of the form state', () => {
    const { result } = renderHook(() => useCoachOnboarding('user-1'));

    act(() => {
      result.current.updateField('name', 'Jane Doe');
      result.current.updateField('title', 'Executive Coach');
    });
    act(() => {
      result.current.updateSpecialties('burnout');
    });

    // Regression: this used to wipe name/title and corrupt specialties
    expect(result.current.profileData.name).toBe('Jane Doe');
    expect(result.current.profileData.title).toBe('Executive Coach');
    expect(result.current.profileData.specialties).toEqual(['burnout']);
  });

  it('toggling a specialty twice removes it', () => {
    const { result } = renderHook(() => useCoachOnboarding('user-1'));

    act(() => { result.current.updateSpecialties('burnout'); });
    act(() => { result.current.updateSpecialties('leadership'); });
    act(() => { result.current.updateSpecialties('burnout'); });

    expect(result.current.profileData.specialties).toEqual(['leadership']);
  });

  it('validates each step against required fields', () => {
    const { result } = renderHook(() => useCoachOnboarding('user-1'));

    expect(result.current.validateStep(0)).toBeFalsy();
    act(() => {
      result.current.updateField('name', 'Jane');
      result.current.updateField('title', 'Coach');
    });
    expect(result.current.validateStep(0)).toBeTruthy();
  });
});

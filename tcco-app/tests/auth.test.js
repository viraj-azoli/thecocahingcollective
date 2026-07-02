import { describe, it, expect } from 'vitest';
import { supabase } from '../src/lib/supabase';

describe('Authentication', () => {
  it('should initialize supabase client', () => {
    expect(supabase).toBeDefined();
  });

  it('should have auth methods', () => {
    expect(supabase.auth.signUp).toBeDefined();
    expect(supabase.auth.signInWithPassword).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.getUser).toBeDefined();
  });

  it('should have database methods', () => {
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from('users')).toBe('object');
  });

  it('should have storage methods', () => {
    expect(supabase.storage).toBeDefined();
    expect(supabase.storage.from).toBeDefined();
  });
});

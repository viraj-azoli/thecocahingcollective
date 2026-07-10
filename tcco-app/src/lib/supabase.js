import { createClient } from '@supabase/supabase-js';

const decode = (b64) => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(b64);
  }
  return Buffer.from(b64, 'base64').toString('utf-8');
};

const supabaseUrl = decode('aHR0cHM6Ly9nemFneXp2Y2VrdnBzZHBra3Fuby5zdXBhYmFzZS5jbw==');
const supabaseKey = decode('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1kNllXZDVlblpqWld0MmNITmtjR3RyY1c1dklpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpnM016RTFOVFVzSW1WNGNDSTZNakE1TkRNd056VTFOWDAuanVzUFlvZDRSQnpkRTNBMjRrdkhnUnA4czh1T2tpUmF2Rm04MWFWcHlfOA==');

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for authenticated requests
export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
  };
};

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to get current session
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

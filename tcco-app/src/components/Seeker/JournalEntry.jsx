import React, { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';

export default function JournalEntry() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get seeker profile
      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Save journal entry
      const { error } = await supabase
        .from('journal_entries')
        .insert([{
          seeker_id: profile.id,
          date: new Date().toISOString().split('T')[0],
          content,
          mood,
        }]);

      if (error) throw error;

      setSuccess(true);
      setContent('');
      setMood(3);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving journal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="journal-container">
      <h2>📔 Today's Reflection</h2>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="mood">How are you feeling today?</label>
          <div className="mood-selector">
            {[1, 2, 3, 4, 5].map(m => (
              <button
                key={m}
                type="button"
                className={`mood-btn ${mood === m ? 'active' : ''}`}
                onClick={() => setMood(m)}
                title={['Very Bad', 'Bad', 'Neutral', 'Good', 'Very Good'][m - 1]}
              >
                {['😢', '😕', '😐', '🙂', '😄'][m - 1]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">Your Thoughts</label>
          <textarea
            id="content"
            placeholder="Write whatever is on your mind..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
        </div>

        {success && <div className="success-message">✓ Entry saved successfully!</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  );
}

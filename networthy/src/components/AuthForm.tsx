import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthError } from '@supabase/supabase-js';

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Sign In / Sign Up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authError: AuthError | null = null;
      if (isSignUp) {
        const { error } = await signUp({ email, password });
        authError = error;
        if (!error) {
            alert('Sign up successful! Please check your email to confirm your account.');
            // Optionally switch to sign in view or clear form
            setIsSignUp(false);
            setEmail('');
            setPassword('');
        }
      } else {
        const { error } = await signIn({ email, password });
        authError = error;
        // No alert needed for sign in, the AuthContext will handle redirect/state change
      }

      if (authError) {
        setError(authError.message);
      }
    } catch (err) {
      console.error("Unexpected auth error:", err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <button
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null); // Clear errors when switching modes
        }}
        style={{ marginTop: '15px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </button>
    </div>
  );
};

export default AuthForm; 
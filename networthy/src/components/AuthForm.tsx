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
    // Center the form on the page
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        {/* Use card styling */}
        <div className="card w-full max-w-md mx-auto py-8">
            {/* App Name */}
            <h1 className="text-3xl font-bold text-center text-primary-600 mb-2"> 
              Networthy
            </h1>
            {/* Sign In/Up Title */}
            <h2 className="text-xl font-semibold text-center text-gray-600 dark:text-gray-300 mb-6">
                {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input mt-1 w-full" // Use standard input class
                    disabled={loading}
                />
                </div>
                {/* Password Input */}
                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input mt-1 w-full" // Use standard input class
                    disabled={loading}
                />
                </div>
                
                {/* Error Message */}
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                
                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="btn-primary w-full" // Use standard primary button class
                >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>
            
            {/* Toggle Button */}
            <div className="mt-6 text-center">
                 <button
                    onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null); 
                    }}
                    className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium focus:outline-none" // Link-like style
                >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AuthForm; 
import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthForm from './AuthForm';

interface AuthGateProps {
  children: ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // While checking auth state, show nothing or a loader
  if (loading) {
    return <div>Loading...</div>; // Or return null, or a proper spinner component
  }

  // If user is logged in, render the protected content
  if (user) {
    return <>{children}</>;
  }

  // If no user is logged in, show the authentication form
  return <AuthForm />;
};

export default AuthGate; 
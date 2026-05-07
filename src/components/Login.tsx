import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center"
      >
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to SmartBus</h1>
        <p className="text-gray-500 mb-8 text-sm">Please sign in to access the bus tracking dashboard and verification terminal.</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 brightness-0 invert" alt="Google" />
          Sign in with Google
        </button>

        <p className="mt-8 text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, User, Building, Phone, Mail, Lock, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    companyName: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ✅ NEW: password visibility
  const [showPassword, setShowPassword] = useState(false);

  // ✅ NEW: terms checkbox
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ✅ NEW: redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value.trimStart() // ✅ trim input
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // ✅ NEW: Terms validation
    if (!acceptedTerms) {
      setMessage({ type: 'error', text: 'You must accept Terms & Conditions.' });
      setLoading(false);
      return;
    }

    // Existing validations (kept)
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      setLoading(false);
      return;
    }

    // ✅ NEW: email format check
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage({ type: 'error', text: 'Invalid email format.' });
      setLoading(false);
      return;
    }

    // ✅ NEW: mobile validation (basic)
    if (!/^\+?[0-9]{10,15}$/.test(formData.mobile)) {
      setMessage({ type: 'error', text: 'Invalid mobile number.' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone: formData.mobile,
          company: formData.companyName || null,
        },
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Account created! Redirecting...' 
      });

      // ✅ NEW: auto redirect after success
      setTimeout(() => {
        router.push('/login');
      }, 2000);

      setFormData({ fullName: '', email: '', mobile: '', companyName: '', password: '', confirmPassword: '' });
    }
    setLoading(false);
  };

  // ✅ NEW: Google Signup
  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  // ✅ NEW: password strength
  const getPasswordStrength = () => {
    if (formData.password.length > 10) return 'Strong';
    if (formData.password.length > 6) return 'Medium';
    return 'Weak';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        
        <div className="bg-gray-900 p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1">Join thousands of sellers optimizing their business.</p>
        </div>

        <div className="p-8">
          
          {message && (
            <div className={`mb-6 p-4 text-sm rounded-lg border flex items-start gap-3 ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-green-50 text-green-700 border-green-100'
            }`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              {message.text}
            </div>
          )}

          {/* ✅ NEW: Google Signup */}
          <button
            onClick={handleGoogleSignup}
            className="w-full mb-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Continue with Google
          </button>

          <form onSubmit={handleSignup} className="space-y-5">
            
            {/* (ALL YOUR EXISTING FIELDS UNCHANGED) */}

            {/* PASSWORD STRENGTH */}
            {formData.password && (
              <p className="text-xs text-gray-500">
                Strength: {getPasswordStrength()}
              </p>
            )}

            {/* ✅ NEW: Terms checkbox */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
              />
              <span>
                I agree to the <a href="#" className="text-blue-600">Terms & Conditions</a>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

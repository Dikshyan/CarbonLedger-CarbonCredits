import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User } from 'lucide-react';

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      register(email, password, name);
      setLocation('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 shadow-lg border-t-4 border-teal-500">
        <div className="text-center mb-8">
          <img
            src="/manus-storage/bcr-logo_95923b37.png"
            alt="Blue Carbon Registry"
            className="h-12 w-12 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-blue-900">Register Your Project</h1>
          <p className="text-slate-600 text-sm mt-2">
            Join the registry and start measuring your coastal restoration impact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Full Name
            </Label>
            <div className="relative mt-2">
              <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="name"
              type="text"
              placeholder="Donald Trump"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500"
              required
            />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Email Address
            </Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500"
              required
            />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-slate-700 font-medium">
              Password
            </Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500"
              required
            />
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
              Confirm Password
            </Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500"
              required
            />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 transform hover:shadow-lg"
          >
            {loading ? 'Registering Project...' : 'Register & Continue'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            Already registered?{' '}
            <button
              onClick={() => setLocation('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Access your account
            </button>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            By registering, you agree to our Terms of Service and commit to transparent carbon accounting
          </p>
        </div>
      </Card>
    </div>
  );
}

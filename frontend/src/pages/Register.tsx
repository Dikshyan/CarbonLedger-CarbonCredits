import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import heroImg from '@/assets/hero.png';

interface Company {
  id: number;
  name: string;
}

const ROLES = ['Company Buyer', 'Government Official', 'NGO Representative', 'Admin'];

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/v1/CarbonLedger/')
      .then(setCompanies)
      .catch(() => {
        // Non-fatal: buyer role selection will just show an empty list
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!role) {
      setError('Please select a role');
      return;
    }
    if (role === 'Company Buyer' && !companyId) {
      setError('Company Buyers must select a company');
      return;
    }

    setLoading(true);
    try {
      await register({
        username,
        email,
        password,
        role,
        ...(companyId ? { company: parseInt(companyId, 10) } : {}),
      });
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 shadow-lg border-t-4 border-teal-500">
        <div className="text-center mb-8">
          <img src={heroImg} alt="Blue Carbon Registry" className="h-12 w-12 mx-auto mb-4 object-cover rounded" />
          <h1 className="text-2xl font-bold text-blue-900">Register Your Account</h1>
          <p className="text-slate-600 text-sm mt-2">
            Join the registry and start tracking your blue carbon impact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
            <div className="relative mt-2">
              <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
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
            <Label htmlFor="role" className="text-slate-700 font-medium">Role</Label>
            <div className="mt-2">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === 'Company Buyer' && (
            <div>
              <Label htmlFor="company" className="text-slate-700 font-medium">Company</Label>
              <div className="mt-2">
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {companies.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  No companies exist yet — an Admin or NGO Representative should register one first.
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
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
            <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
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
            {loading ? 'Registering...' : 'Register & Continue'}
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
      </Card>
    </div>
  );
}
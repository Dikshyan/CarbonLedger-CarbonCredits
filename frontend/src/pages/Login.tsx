import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserIcon, Lock } from 'lucide-react';
import heroImg from '@/assets/hero.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 shadow-lg border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <img
            src={heroImg}
            alt="Blue Carbon Registry"
            className="h-12 w-12 mx-auto mb-4 object-cover rounded"
          />
          <h1 className="text-2xl font-bold text-blue-900">Access Your Registry</h1>
          <p className="text-slate-600 text-sm mt-2">
            Sign in to manage your coastal restoration portfolio and track carbon impact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="username" className="text-slate-700 font-medium">
              Username
            </Label>
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
            {loading ? 'Accessing Registry...' : 'Access Registry'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            New to the registry?{' '}
            <button
              onClick={() => setLocation('/register')}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Register your project
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { useLocation } from 'wouter';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  User as UserIcon,
  Mail,
  Shield,
  Building2,
  Wallet,
  Coins,
  Leaf,
  Plus,
  ArrowRight,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  status?: string;
  wallet_address?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [userProjects, setUserProjects] = useState<Company[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [totalCredits, setTotalCredits] = useState<number>(0);

  useEffect(() => {
    loadProfileData();
    checkWallet();
  }, [user]);

  const loadProfileData = async () => {
    try {
      const [projData, txData] = await Promise.all([
        apiFetch('/CarbonLedger/'),
        apiFetch('/CarbonLedgerTransactions/'),
      ]);

      const projects = Array.isArray(projData) ? projData : [];
      const transactions = Array.isArray(txData) ? txData : [];

      setUserProjects(projects);

      const credits = transactions.reduce((acc: number, t: any) => {
        const amt = parseFloat(t.credits) || 0;
        if (['Issuance', 'Recieve'].includes(t.transaction_type)) return acc + amt;
        if (['Transfer', 'Cancellation'].includes(t.transaction_type)) return acc - amt;
        return acc;
      }, 0);

      setTotalCredits(Math.max(0, credits));
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err) {
        console.error('Wallet check error:', err);
      }
    } else {
      setWalletAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          {/* Top Profile Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white mb-8 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-blue-500/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{user?.username || 'Authenticated User'}</h1>
                  <p className="text-blue-200 text-sm flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{user?.email || 'user@carbonledger.org'}</span>
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-blue-400/20 border border-blue-300/30 rounded-full text-xs font-medium text-blue-100">
                    Role: {user?.role || 'Member'}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2">
                <Button
                  onClick={() => setLocation('/projects')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Register Project
                </Button>
                <Button
                  variant="outline"
                  onClick={logout}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 text-xs font-medium"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Carbon Credit Balance</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalCredits.toLocaleString()} tCO₂e</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Leaf className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Registered Projects</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{userProjects.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Web3 Wallet</p>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate max-w-[160px]">
                    {walletAddress || 'Not Connected'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* User's Projects */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Registered Blue Carbon Projects</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/dashboard')}
                className="text-blue-600 text-xs font-medium gap-1"
              >
                <span>View Full Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {userProjects.length === 0 ? (
              <Card className="p-8 text-center border-slate-200 bg-white">
                <Leaf className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">No projects registered yet.</p>
                <Button
                  size="sm"
                  onClick={() => setLocation('/projects')}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                >
                  Register First Project
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProjects.map((proj) => (
                  <Card key={proj.id} className="p-5 border-slate-200 bg-white hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {proj.type}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          proj.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : proj.status === 'Rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}
                      >
                        {proj.status === 'Verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {proj.status || 'Pending'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">{proj.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">📍 {proj.location}</p>

                    <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 text-slate-600">
                      <span>Area: {proj.estimated_area_hectares || '500'} ha</span>
                      <span className="font-semibold text-blue-600">
                        {parseFloat(proj.expected_carbon_sequestration || '200000').toLocaleString()} tCO₂e
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

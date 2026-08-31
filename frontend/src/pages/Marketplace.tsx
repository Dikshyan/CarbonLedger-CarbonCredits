import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingBag,
  Wallet,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Coins,
  Leaf,
  ArrowRight
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  wallet_address?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  active: boolean;
}

interface Transaction {
  id: number;
  project: number;
  credits: string;
  transaction_type: string;
  ipfs_cid: string | null;
  tx_hash: string | null;
  created_at: string;
}

export default function Marketplace() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricePerCredit, setPricePerCredit] = useState<number>(18.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);

  // Purchase Modal / State
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [buyAmount, setBuyAmount] = useState<number>(100);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceData();
    checkWalletConnection();
  }, []);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const [projData, txData, priceData] = await Promise.all([
        apiFetch('/CarbonLedger/'),
        apiFetch('/CarbonLedgerTransactions/'),
        apiFetch('/pricing/').catch(() => ({ price_per_credit: '18.50' })),
      ]);

      setProjects(Array.isArray(projData) ? projData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      if (priceData?.price_per_credit) {
        setPricePerCredit(parseFloat(priceData.price_per_credit));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load marketplace data.');
    } finally {
      setLoading(false);
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
      }
    }
  };

  const connectWallet = async () => {
    setConnectingWallet(true);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } else {
        // Fallback demo connection with Hardhat Account #0
        setWalletAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      }
    } catch (err: any) {
      setError(err.message || 'MetaMask connection rejected');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleBuyCredits = async (project: Company) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setPurchasingId(project.id);
    setError(null);
    setPurchaseSuccess(null);

    try {
      // Create Carbon Credit Transaction via Django API
      const txPayload = {
        project: project.id,
        credits: buyAmount.toString(),
        transaction_type: 'Transfer',
        wallet_address: walletAddress || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      };

      const res = await apiFetch('/CarbonLedgerTransactions/', {
        method: 'POST',
        body: JSON.stringify(txPayload),
      });

      setPurchaseSuccess(
        `Successfully purchased ${buyAmount} carbon credits from "${project.name}"! IPFS CID: ${res.ipfs_cid || 'Generated'}`
      );
      loadMarketplaceData();
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Ensure sufficient project credits.');
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="h-7 w-7 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-900">Blue Carbon Marketplace</h1>
            </div>
            <p className="text-slate-600">
              Browse, trade, and retire verified coastal blue carbon credits anchored on Polygon & IPFS.
            </p>
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center gap-3">
            {walletAddress ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-sans">
                  Hardhat :8545
                </span>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={connectingWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-xs"
              >
                <Wallet className="h-4 w-4" />
                {connectingWallet ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
            )}
          </div>
        </div>

        {/* Global Market Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Spot Carbon Price</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">${pricePerCredit.toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ tCO₂e</span></p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Coins className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Listed Projects</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Leaf className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total IPFS Verified</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.filter(t => t.ipfs_cid).length} Receipts</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {purchaseSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="font-semibold">{purchaseSuccess}</p>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            {['All', 'Blue Carbon Project', 'Buyer Company'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading verified carbon projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 bg-white">
            <Leaf className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No Projects Found</h3>
            <p className="text-sm text-slate-500 mb-4">No blue carbon projects match your search criteria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const projectTxs = transactions.filter((t) => t.project === project.id);
              const latestCID = projectTxs.find((t) => t.ipfs_cid)?.ipfs_cid;
              const expectedCredits = parseFloat(project.expected_carbon_sequestration || '50000');

              return (
                <Card key={project.id} className="p-6 border-slate-200 bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                        {project.type}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-1">{project.name}</h3>
                    <p className="text-xs text-slate-500 mb-4">📍 {project.location}</p>

                    <div className="space-y-2 py-3 border-y border-slate-100 mb-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Available Credits</span>
                        <span className="font-bold text-slate-800">{expectedCredits.toLocaleString()} tCO₂e</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Unit Price</span>
                        <span className="font-bold text-blue-600">${pricePerCredit.toFixed(2)} / credit</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">IPFS CID</span>
                        {latestCID ? (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${latestCID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>{latestCID.slice(0, 8)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Pinata Pinned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => handleBuyCredits(project)}
                      disabled={purchasingId === project.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-2"
                    >
                      {purchasingId === project.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing Transaction...
                        </>
                      ) : (
                        <>
                          <span>Buy Credits (${(100 * pricePerCredit).toFixed(0)})</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

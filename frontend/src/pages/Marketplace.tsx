import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
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
  ArrowRight,
  MapPin,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  about?: string;
  status?: string;
  wallet_address?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  latitude?: string | number;
  longitude?: string | number;
  active: boolean;
  added_date?: string;
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
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricePerCredit, setPricePerCredit] = useState<number>(18.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Wallet State (MetaMask)
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const connectingWalletRef = useRef(false);
  const [chainName, setChainName] = useState<string>('');
  const [connectedChainId, setConnectedChainId] = useState<number | null>(null);

  // Polygon Amoy Testnet — the intended network per BLOCKCHAIN_HANDOFF.md
  const EXPECTED_CHAIN_ID = 80002;
  const EXPECTED_CHAIN_NAME = 'Polygon Amoy';

  // Project Details Modal State (Accessible without login)
  const [selectedDetailsProject, setSelectedDetailsProject] = useState<Company | null>(null);

  // Purchase Flow State (Requires BlueChain login + MetaMask)
  const [purchasingProject, setPurchasingProject] = useState<Company | null>(null);
  const [buyAmount, setBuyAmount] = useState<number>(100);
  const [isExecutingPurchase, setIsExecutingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceData();
    checkWalletConnection();

    const eth = (window as any).ethereum;
    if (eth) {
      const onAccountsChanged = (accounts: string[]) => {
        setWalletAddress(accounts.length > 0 ? accounts[0] : null);
      };
      const onChainChanged = () => {
        checkWalletConnection();
      };
      eth.on('accountsChanged', onAccountsChanged);
      eth.on('chainChanged', onChainChanged);
      return () => {
        eth.removeListener('accountsChanged', onAccountsChanged);
        eth.removeListener('chainChanged', onChainChanged);
      };
    }
  }, []);

  // Handle return path query params (e.g. after login: /marketplace?buy=1&amount=100)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buyId = params.get('buy');
    const amountParam = params.get('amount');
    if (buyId && projects.length > 0) {
      const targetProj = projects.find((p) => p.id === parseInt(buyId, 10));
      if (targetProj) {
        if (amountParam) {
          setBuyAmount(parseInt(amountParam, 10) || 100);
        }
        setPurchasingProject(targetProj);
      }
    }
  }, [projects]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch transactions when authenticated — the endpoint requires
      // IsAuthenticated and would return 403 for guests.
      const txPromise = user
        ? apiFetch('/CarbonLedgerTransactions/').catch(() => [])
        : Promise.resolve([]);

      const [projData, txData, priceData] = await Promise.all([
        apiFetch('/CarbonLedger/').catch(() => []),
        txPromise,
        apiFetch('/pricing/').catch(() => ({ price_per_credit: '18.50' })),
      ]);

      setProjects(Array.isArray(projData) ? projData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      if (priceData?.price_per_credit) {
        setPricePerCredit(parseFloat(priceData.price_per_credit));
      }
    } catch (err: any) {
      const msg = err?.message || '';
      // Do not display raw 401/unauthorized errors to users
      if (!msg.includes('401') && !msg.toLowerCase().includes('unauthorized')) {
        setError('Failed to load marketplace data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getChainName = (chainId: string): string => {
    const id = parseInt(chainId, 16);
    const names: Record<number, string> = {
      1: 'Ethereum Mainnet',
      137: 'Polygon Mainnet',
      80002: 'Polygon Amoy',
      31337: 'Hardhat :8545',
      1337: 'Localhost :8545',
    };
    return names[id] || `Chain ${id}`;
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          setChainName(getChainName(chainId));
          setConnectedChainId(parseInt(chainId, 16));
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
      }
    }
  };

  const connectWallet = async () => {
    // Synchronous guard: prevent duplicate MetaMask permission requests
    if (connectingWalletRef.current) return;
    connectingWalletRef.current = true;
    setConnectingWallet(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          setChainName(getChainName(chainId));
          setConnectedChainId(parseInt(chainId, 16));
        }
      } else {
        setError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      }
    } catch (err: any) {
      setError(err.message || 'MetaMask connection rejected');
    } finally {
      connectingWalletRef.current = false;
      setConnectingWallet(false);
    }
  };

  const handleBuyCredits = (project: Company) => {
    // 1. If logged out, redirect to Login with a return path to the selected purchase flow
    if (!user) {
      const returnPath = `/marketplace?buy=${project.id}&amount=${buyAmount}`;
      setLocation(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }

    // 2. If logged in, open the purchase confirmation dialog
    setError(null);
    setPurchaseSuccess(null);
    setPurchasingProject(project);
  };

  const executePurchase = async (project: Company, amount: number) => {
    // 3. After login, require MetaMask connection before purchase
    if (!walletAddress) {
      if (!connectingWalletRef.current) {
        await connectWallet();
      }
      return;
    }

    setIsExecutingPurchase(true);
    setError(null);
    setPurchaseSuccess(null);

    try {
      const txPayload = {
        project: project.id,
        credits: amount.toString(),
        transaction_type: 'Recieve',
        wallet_address: walletAddress,
      };

      const res = await apiFetch('/CarbonLedgerTransactions/', {
        method: 'POST',
        body: JSON.stringify(txPayload),
      });

      setPurchaseSuccess(
        `Successfully purchased ${amount} carbon credits from "${project.name}"! IPFS CID: ${res.ipfs_cid || 'Generated'}`
      );
      setPurchasingProject(null);

      // Clean up search query param after successful purchase
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      loadMarketplaceData();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setError('Your session has expired. Please sign in again to purchase credits.');
      } else {
        setError(msg || 'Purchase failed. Ensure sufficient project credits.');
      }
    } finally {
      setIsExecutingPurchase(false);
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
                {chainName && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-sans font-medium">
                    {chainName}
                  </span>
                )}
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

        {/* Wrong-network warning */}
        {walletAddress && connectedChainId !== null && connectedChainId !== EXPECTED_CHAIN_ID && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Wrong Network Detected</p>
              <p className="text-amber-700 mt-0.5">
                Your MetaMask is connected to <strong>{chainName || `Chain ${connectedChainId}`}</strong>.
                BlueChain requires <strong>{EXPECTED_CHAIN_NAME} (Chain ID {EXPECTED_CHAIN_ID})</strong>.
                Please switch your MetaMask network to {EXPECTED_CHAIN_NAME} to use the marketplace.
              </p>
            </div>
          </div>
        )}

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
              const statusDisplay = project.status || 'Pending';

              return (
                <Card key={project.id} className="p-6 border-slate-200 bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                        {project.type}
                      </span>
                      {/* Real backend project status (matching Profile.tsx) */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          statusDisplay === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : statusDisplay === 'Rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {statusDisplay === 'Verified' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {statusDisplay}
                      </span>
                    </div>

                    <h3
                      onClick={() => setSelectedDetailsProject(project)}
                      className="text-lg font-bold text-slate-900 mb-1 hover:text-blue-600 cursor-pointer transition-colors"
                      title="Click to view project details"
                    >
                      {project.name}
                    </h3>
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

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedDetailsProject(project)}
                      className="flex-1 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => handleBuyCredits(project)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <span>Buy Credits</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Project Details Modal (Public: works without login) */}
        {selectedDetailsProject && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-white p-6 shadow-2xl relative border-slate-200 my-8">
              <button
                onClick={() => setSelectedDetailsProject(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {selectedDetailsProject.type}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    selectedDetailsProject.status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedDetailsProject.status === 'Rejected'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {selectedDetailsProject.status === 'Verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {selectedDetailsProject.status || 'Pending'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedDetailsProject.name}</h2>
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mb-4">
                <MapPin className="h-4 w-4 text-slate-400" />
                {selectedDetailsProject.location}
              </p>

              <div className="p-4 bg-slate-50 rounded-lg mb-6 text-sm text-slate-700 leading-relaxed border border-slate-100">
                <p className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wider">Project Overview</p>
                <p>{selectedDetailsProject.about || 'Verified coastal ecosystem and blue carbon restoration initiative.'}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400">Available Credits</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {parseFloat(selectedDetailsProject.expected_carbon_sequestration || '50000').toLocaleString()} tCO₂e
                  </p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-blue-600">Spot Unit Price</span>
                  <p className="text-base font-bold text-blue-700 mt-0.5">${pricePerCredit.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400">Restoration Area</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedDetailsProject.estimated_area_hectares || '500'} ha
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-4 mb-6 text-slate-600">
                {selectedDetailsProject.wallet_address && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Project Wallet Address:</span>
                    <span className="font-mono text-slate-800">{selectedDetailsProject.wallet_address}</span>
                  </div>
                )}
                {selectedDetailsProject.latitude && selectedDetailsProject.longitude && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-800">
                      {selectedDetailsProject.latitude}, {selectedDetailsProject.longitude}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setSelectedDetailsProject(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const proj = selectedDetailsProject;
                    setSelectedDetailsProject(null);
                    handleBuyCredits(proj);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs gap-1.5"
                >
                  <span>Buy Credits</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Purchase Confirmation Modal (Requires BlueChain Login + MetaMask) */}
        {purchasingProject && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white p-6 shadow-2xl relative border-slate-200">
              <button
                onClick={() => setPurchasingProject(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Cancel purchase"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Purchase Carbon Credits</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Project: <span className="font-semibold text-slate-800">{purchasingProject.name}</span>
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credits to Purchase (tCO₂e)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="bg-white"
                  />
                </div>

                <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Unit Price:</span>
                    <span className="font-semibold text-slate-800">${pricePerCredit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-blue-200/60">
                    <span>Total Cost:</span>
                    <span className="text-blue-700">${(buyAmount * pricePerCredit).toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Require MetaMask connection before purchase */}
                {!walletAddress ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">MetaMask Connection Required</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Please connect your MetaMask wallet before signing this carbon credit purchase on Polygon.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={connectWallet}
                      disabled={connectingWallet}
                      className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-2 shadow-xs"
                    >
                      <Wallet className="h-4 w-4" />
                      {connectingWallet ? 'Connecting to MetaMask...' : 'Connect MetaMask Wallet'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-mono text-emerald-800">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      MetaMask Connected
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setPurchasingProject(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => executePurchase(purchasingProject, buyAmount)}
                  disabled={!walletAddress || isExecutingPurchase}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs gap-2"
                >
                  {isExecutingPurchase ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executing Transfer...
                    </>
                  ) : (
                    <>
                      <span>Confirm Purchase</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

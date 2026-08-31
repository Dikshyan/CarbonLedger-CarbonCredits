import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  project: number;
  credits: string;
  transaction_type: string;
  created_at: string;
  ipfs_cid: string | null;
}

const INCOMING = ['Issuance', 'Recieve'];
const OUTGOING = ['Transfer', 'Cancellation', 'Cancellatiobn'];

export default function CarbonHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Record<number, string>>({});
  const [pricePerCredit, setPricePerCredit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/pricing/'),
    ])
      .then(([txData, companyData, pricingData]: [Transaction[], Company[], any]) => {
        const scopedTx =
          user?.role === 'Company Buyer' && user.company
            ? txData.filter((t) => t.project === user.company)
            : txData;
        setTransactions(scopedTx);
        setCompanies(Object.fromEntries(companyData.map((c) => [c.id, c.name])));
        setPricePerCredit(parseFloat(pricingData.price_per_credit));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const getStatusColor = (t: Transaction) => {
    if (INCOMING.includes(t.transaction_type)) return t.ipfs_cid ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusLabel = (t: Transaction) => {
    if (INCOMING.includes(t.transaction_type)) return t.ipfs_cid ? 'Verified' : 'Pending';
    return 'Completed';
  };

  const totalCredits = transactions.reduce((sum, t) => sum + parseFloat(t.credits), 0);
  const creditsSold = transactions
    .filter((t) => OUTGOING.includes(t.transaction_type))
    .reduce((sum, t) => sum + parseFloat(t.credits), 0);
  const totalRevenue = creditsSold * pricePerCredit;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading history...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Carbon Credit History</h1>
            <p className="text-slate-600">
              Track all your carbon credit transactions and earnings
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <p className="text-sm font-medium text-slate-600 mb-2">Total Credits</p>
              <p className="text-3xl font-bold text-slate-900">{totalCredits.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Across all transactions</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-slate-600 mb-2">Credits Sold / Transferred</p>
              <p className="text-3xl font-bold text-green-600">{creditsSold.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">For monetization</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-slate-600 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600">${totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">At ${pricePerCredit}/credit</p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Transaction History</h2>

            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No transactions yet.</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((t) => {
                  const isIncoming = INCOMING.includes(t.transaction_type);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2 rounded-lg ${isIncoming ? 'bg-blue-100' : 'bg-green-100'}`}>
                          {isIncoming ? (
                            <ArrowDownLeft className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {t.transaction_type} — {companies[t.project] ?? `Project #${t.project}`}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {isIncoming ? '+' : '-'}{parseFloat(t.credits).toLocaleString()} credits
                          </p>
                          <p className="text-sm text-slate-600">
                            ${(parseFloat(t.credits) * pricePerCredit).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(t)}>{getStatusLabel(t)}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
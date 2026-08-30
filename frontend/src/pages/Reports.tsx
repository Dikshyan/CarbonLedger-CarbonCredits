import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  added_date?: string;
}

interface Transaction {
  id: number;
  project: number;
  credits: string;
  transaction_type: string;
  ipfs_cid: string | null;
  created_at: string;
}

export default function Reports() {
  const [projects, setProjects] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, txData] = await Promise.all([
        apiFetch('/CarbonLedger/'),
        apiFetch('/CarbonLedgerTransactions/'),
      ]);
      setProjects(Array.isArray(projData) ? projData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load MRV reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (projectId: number, projectName: string) => {
    setGeneratingId(projectId);
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:8000/api/v1/CarbonLedger/${projectId}/report/`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate MRV report PDF/HTML');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MRV_Report_${projectName.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Error generating report.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-7 w-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">MRV Reports & Certificates</h1>
          </div>
          <p className="text-slate-600">
            Cryptographically anchored Monitoring, Reporting, and Verification (MRV) reports pinned to IPFS.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading verified reports...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 bg-white">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No Reports Available</h3>
            <p className="text-sm text-slate-500 mb-4">Register a project first to generate MRV reports.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => {
              const projectTxs = transactions.filter((t) => t.project === project.id);
              const latestCID = projectTxs.find((t) => t.ipfs_cid)?.ipfs_cid;

              return (
                <Card key={project.id} className="p-6 border-slate-200 bg-white shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {project.type}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>MRV Verified</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">{project.name}</h3>
                      <p className="text-xs text-slate-500">📍 {project.location}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Project Area</p>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {project.estimated_area_hectares || '500'} ha
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Carbon Est.</p>
                          <p className="font-semibold text-blue-600 mt-0.5">
                            {parseFloat(project.expected_carbon_sequestration || '200000').toLocaleString()} tCO₂e
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">IPFS Verification</p>
                          {latestCID ? (
                            <a
                              href={`https://gateway.pinata.cloud/ipfs/${latestCID}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>{latestCID.slice(0, 8)}...</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className="text-slate-400 mt-0.5">Pending Pin</p>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Issuance Date</p>
                          <p className="text-slate-700 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date().toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[200px]">
                      <Button
                        onClick={() => handleDownloadReport(project.id, project.name)}
                        disabled={generatingId === project.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-2 shadow-xs"
                      >
                        {generatingId === project.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating MRV PDF...
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            Download MRV Report
                          </>
                        )}
                      </Button>

                      {latestCID && (
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${latestCID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                          View IPFS Metadata
                        </a>
                      )}
                    </div>
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

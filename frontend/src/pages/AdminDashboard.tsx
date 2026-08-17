import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatCard from '@/components/StatCard';
import { Users, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const pendingProjects = [
    {
      id: 1,
      name: 'Kelp Forest Restoration',
      organization: 'Ocean Conservation Ltd',
      submittedDate: '2024-07-12',
      status: 'pending',
    },
    {
      id: 2,
      name: 'Mangrove Expansion Project',
      organization: 'Green Earth Initiative',
      submittedDate: '2024-07-10',
      status: 'pending',
    },
    {
      id: 3,
      name: 'Coastal Wetland Protection',
      organization: 'Marine Stewards',
      submittedDate: '2024-07-08',
      status: 'review',
    },
  ];

  const systemMetrics = [
    {
      label: 'Total Users',
      value: 1247,
      icon: <Users className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+12% this month',
    },
    {
      label: 'Verified Projects',
      value: 342,
      icon: <CheckCircle className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+28 this month',
    },
    {
      label: 'Pending Review',
      value: 18,
      icon: <AlertCircle className="h-6 w-6" />,
      description: 'Awaiting verification',
    },
    {
      label: 'Total Credits Issued',
      value: '2.4M',
      icon: <TrendingUp className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+185K this month',
    },
  ];

  return (
    <ProtectedRoute adminOnly>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
            <p className="text-slate-600">
              Manage projects, users, and system-wide metrics
            </p>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {systemMetrics.map((metric, index) => (
              <StatCard
                key={index}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
                trend={metric.trend as 'up' | 'down' | undefined}
                trendValue={metric.trendValue}
                description={metric.description}
              />
            ))}
          </div>

          {/* Pending Projects */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Pending Project Verifications</h2>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                {pendingProjects.length} pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Project Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Organization</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Submitted</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProjects.map((project) => (
                    <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{project.name}</td>
                      <td className="py-3 px-4 text-slate-600">{project.organization}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{project.submittedDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* System Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Carbon Credit Pricing</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Current Price per Credit</p>
                  <p className="text-2xl font-bold text-slate-900">$15.00</p>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Update Pricing
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">System Configuration</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Verification Required</p>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Auto-approve Credits</p>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                  Save Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

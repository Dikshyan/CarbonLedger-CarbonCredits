import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import WaveDivider from '@/components/WaveDivider';
import { Leaf, TrendingUp, Globe, BarChart3 } from 'lucide-react';
import oceanecosystem from '@/assets/oceanecosystem.jpeg'

export default function Landing() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Globe className="h-8 w-8" />,
      title: 'Global Reach',
      description: 'Connect coastal restoration projects worldwide and track their impact.',
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: 'Real-time Analytics',
      description: 'Monitor carbon sequestration with advanced data visualization and reporting.',
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: 'Monetize Impact',
      description: 'Convert verified blue carbon credits into revenue streams.',
    },
    {
      icon: <Leaf className="h-8 w-8" />,
      title: 'Scientific Rigor',
      description: 'Leverage peer-reviewed methodologies for accurate carbon accounting.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-teal-50 py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6 leading-tight">
                Measure Your Marine Impact
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Transform coastal restoration into measurable climate action. The Blue Carbon Registry connects organizations with scientific tools to verify, track, and monetize their blue carbon impact.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => setLocation('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation('/login')}
                >
                  Sign In
                </Button>
              </div>
            </div>
            <div className="relative">
              /*
              <img
                src={oceanecosystem}
                alt="Ocean ecosystem"
                className="rounded-lg shadow-2xl"
              />
              */
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      <WaveDivider position="bottom" color="#f8fafc" />

      {/* Features Section */}
      <section className="bg-slate-50 py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Powerful Tools for Climate Action
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to measure, verify, and monetize your blue carbon impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-teal-600 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-teal-600 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of organizations measuring and monetizing their blue carbon impact.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation('/register')}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            Start Your Project Today
          </Button>
        </div>
      </section>
    </div>
  );
}

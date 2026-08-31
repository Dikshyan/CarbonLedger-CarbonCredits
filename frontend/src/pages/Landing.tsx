import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import WaveDivider from '@/components/WaveDivider';
import { Leaf, TrendingUp, Globe, BarChart3, Shield, Zap } from 'lucide-react';

/* ─────────────────────────────────────────────
   Animated SVG ocean / wave hero background
───────────────────────────────────────────── */
function OceanHeroSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0c4a6e" stopOpacity="1" />
          <stop offset="50%"  stopColor="#0e7490" stopOpacity="1" />
          <stop offset="100%" stopColor="#064e3b" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Deep ocean background */}
      <rect width="100%" height="100%" fill="url(#oceanGrad)" />

      {/* Animated wave 1 */}
      <path fill="url(#waveGrad1)">
        <animate
          attributeName="d"
          dur="8s"
          repeatCount="indefinite"
          values="
            M0,200 C150,150 350,250 500,200 C650,150 850,250 1000,200 C1150,150 1350,250 1440,200 L1440,600 L0,600 Z;
            M0,220 C150,270 350,170 500,220 C650,270 850,170 1000,220 C1150,270 1350,170 1440,220 L1440,600 L0,600 Z;
            M0,200 C150,150 350,250 500,200 C650,150 850,250 1000,200 C1150,150 1350,250 1440,200 L1440,600 L0,600 Z"
        />
      </path>

      {/* Animated wave 2 */}
      <path fill="url(#waveGrad2)">
        <animate
          attributeName="d"
          dur="11s"
          repeatCount="indefinite"
          values="
            M0,280 C200,230 400,330 600,280 C800,230 1000,330 1200,280 C1350,240 1420,300 1440,280 L1440,600 L0,600 Z;
            M0,300 C200,350 400,250 600,300 C800,350 1000,250 1200,300 C1350,340 1420,280 1440,300 L1440,600 L0,600 Z;
            M0,280 C200,230 400,330 600,280 C800,230 1000,330 1200,280 C1350,240 1420,300 1440,280 L1440,600 L0,600 Z"
        />
      </path>

      {/* Floating particles (mangrove leaves) */}
      {[
        { cx: 120,  cy: 80,  r: 3, dur: '6s'  },
        { cx: 340,  cy: 120, r: 2, dur: '9s'  },
        { cx: 600,  cy: 60,  r: 4, dur: '7s'  },
        { cx: 850,  cy: 100, r: 2, dur: '10s' },
        { cx: 1100, cy: 70,  r: 3, dur: '8s'  },
        { cx: 1300, cy: 130, r: 2, dur: '6s'  },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#34d399" opacity="0.6">
          <animate attributeName="cy" values={`${p.cy};${p.cy - 30};${p.cy}`} dur={p.dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur={p.dur} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = end / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Globe className="h-7 w-7" />,
      title: 'Global Reach',
      description: 'Connect coastal restoration projects worldwide and track their impact in real-time.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <BarChart3 className="h-7 w-7" />,
      title: 'Real-time Analytics',
      description: 'Monitor carbon sequestration with satellite-backed data visualization.',
      gradient: 'from-teal-500 to-emerald-500',
    },
    {
      icon: <TrendingUp className="h-7 w-7" />,
      title: 'Monetize Impact',
      description: 'Convert verified blue carbon credits into on-chain tradeable assets.',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      icon: <Leaf className="h-7 w-7" />,
      title: 'Scientific Rigor',
      description: 'Leverage peer-reviewed IPCC methodologies for accurate carbon accounting.',
      gradient: 'from-green-500 to-teal-500',
    },
    {
      icon: <Shield className="h-7 w-7" />,
      title: 'Blockchain Verified',
      description: 'Every credit is minted on-chain and pinned to IPFS for immutable provenance.',
      gradient: 'from-blue-600 to-indigo-500',
    },
    {
      icon: <Zap className="h-7 w-7" />,
      title: 'AI-Powered MRV',
      description: 'Google Earth Engine + Sentinel-2 NDVI analysis for automated monitoring.',
      gradient: 'from-violet-500 to-blue-500',
    },
  ];

  const stats = [
    { label: 'Tonnes CO₂e Tracked', end: 2400000, suffix: '+' },
    { label: 'Active Projects',       end: 47,       suffix: ''  },
    { label: 'Credits Issued',        end: 186000,   suffix: ''  },
    { label: 'Partner Organizations', end: 23,       suffix: ''  },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden">
        <OceanHeroSVG />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Enterprise Blue Carbon Registry & Verification
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Measure Your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                Marine Impact
              </span>
            </h1>

            <p className="text-lg text-white/80 mb-10 leading-relaxed max-w-xl">
              The Blue Carbon Registry connects coastal restoration projects with AI-powered satellite analysis,
              blockchain credit issuance, and real-time MRV verification.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                id="hero-get-started"
                size="lg"
                onClick={() => setLocation('/register')}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 shadow-lg shadow-emerald-900/40"
              >
                Get Started Free
              </Button>
              <Button
                id="hero-sign-in"
                size="lg"
                variant="outline"
                onClick={() => setLocation('/login')}
                className="border-white/40 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Statistics Row ─────────────────────── */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-3xl md:text-4xl font-extrabold text-white">
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                </p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider position="bottom" color="#f8fafc" />

      {/* ── Features Section ────────────────────────── */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Powerful Tools for Climate Action
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to measure, verify, and monetize your blue carbon impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-slate-200 bg-white"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4 shadow-md`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-teal-600 to-emerald-600 py-20 md:py-28">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Join organizations measuring and monetizing their blue carbon impact.
            Start your first project in minutes — no blockchain expertise required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              id="cta-start-project"
              size="lg"
              onClick={() => setLocation('/register')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-10 shadow-xl"
            >
              Start Your Project Today
            </Button>
            <Button
              id="cta-marketplace"
              size="lg"
              variant="outline"
              onClick={() => setLocation('/marketplace')}
              className="border-white/40 text-white hover:bg-white/10"
            >
              Browse Marketplace
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

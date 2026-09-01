import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { ArrowRight } from 'lucide-react';

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
          <stop offset="0%" stopColor="#0c4a6e" stopOpacity="1" />
          <stop offset="50%" stopColor="#0e7490" stopOpacity="1" />
          <stop offset="100%" stopColor="#064e3b" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
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

      {/* Floating particles */}
      {[
        { cx: 120, cy: 80, r: 3, dur: '6s' },
        { cx: 340, cy: 120, r: 2, dur: '9s' },
        { cx: 600, cy: 60, r: 4, dur: '7s' },
        { cx: 850, cy: 100, r: 2, dur: '10s' },
        { cx: 1100, cy: 70, r: 3, dur: '8s' },
        { cx: 1300, cy: 130, r: 2, dur: '6s' },
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
   FIX 2: Animated Hero Satellite & Coastline Illustration
───────────────────────────────────────────── */
function HeroSatelliteIllustration() {
  return (
    <div className="w-full max-w-[460px] h-[340px] relative flex items-center justify-center select-none">
      <svg
        viewBox="0 0 500 380"
        className="w-full h-full drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="satBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="coastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#042f2e" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0e7490" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Orbit Path Arc */}
        <path
          d="M 50,130 Q 250,20 450,110"
          fill="none"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.4"
        />

        {/* Transmission Beam Cone from Satellite to Coastline */}
        <polygon
          points="250,75 110,320 390,320"
          fill="url(#beamGrad)"
        >
          <animate
            attributeName="opacity"
            values="0.35;0.65;0.35"
            dur="3s"
            repeatCount="indefinite"
          />
        </polygon>

        {/* Animated Data Transmission Lines (Dotted) */}
        <g stroke="#34d399" strokeWidth="1.75" strokeDasharray="5 7" opacity="0.85">
          <line x1="250" y1="80" x2="180" y2="300">
            <animate attributeName="stroke-dashoffset" values="36;0" dur="1.8s" repeatCount="indefinite" />
          </line>
          <line x1="250" y1="80" x2="250" y2="305">
            <animate attributeName="stroke-dashoffset" values="36;0" dur="1.4s" repeatCount="indefinite" />
          </line>
          <line x1="250" y1="80" x2="320" y2="295">
            <animate attributeName="stroke-dashoffset" values="36;0" dur="1.6s" repeatCount="indefinite" />
          </line>
        </g>

        {/* Satellite Group with Hover and Pulse Animation */}
        <g transform="translate(0, 0)">
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-4; 0,4; 0,-4"
              dur="5s"
              repeatCount="indefinite"
            />

            {/* Satellite Pulse Rings */}
            <circle cx="250" cy="65" r="14" fill="none" stroke="#34d399" strokeWidth="1.5" opacity="0.6">
              <animate attributeName="r" values="14;34" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="250" cy="65" r="14" fill="none" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.4">
              <animate attributeName="r" values="14;48" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
            </circle>

            {/* Left Solar Panel */}
            <g transform="translate(145, 48)">
              <rect x="0" y="0" width="70" height="34" rx="3" fill="url(#panelGrad)" stroke="#38bdf8" strokeWidth="1" />
              <line x1="23" y1="0" x2="23" y2="34" stroke="#0369a1" strokeWidth="1" />
              <line x1="47" y1="0" x2="47" y2="34" stroke="#0369a1" strokeWidth="1" />
              <line x1="0" y1="17" x2="70" y2="17" stroke="#0369a1" strokeWidth="1" />
              {/* Connector */}
              <line x1="70" y1="17" x2="85" y2="17" stroke="#94a3b8" strokeWidth="2.5" />
            </g>

            {/* Right Solar Panel */}
            <g transform="translate(285, 48)">
              <rect x="0" y="0" width="70" height="34" rx="3" fill="url(#panelGrad)" stroke="#38bdf8" strokeWidth="1" />
              <line x1="23" y1="0" x2="23" y2="34" stroke="#0369a1" strokeWidth="1" />
              <line x1="47" y1="0" x2="47" y2="34" stroke="#0369a1" strokeWidth="1" />
              <line x1="0" y1="17" x2="70" y2="17" stroke="#0369a1" strokeWidth="1" />
              {/* Connector */}
              <line x1="-15" y1="17" x2="0" y2="17" stroke="#94a3b8" strokeWidth="2.5" />
            </g>

            {/* Central Satellite Body */}
            <rect
              x="230"
              y="46"
              width="40"
              height="38"
              rx="6"
              fill="url(#satBodyGrad)"
              stroke="#6ee7b7"
              strokeWidth="1.5"
            />
            {/* Satellite Sensor Lens */}
            <circle cx="250" cy="65" r="7" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
            <circle cx="250" cy="65" r="3" fill="#38bdf8">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Downward Antenna Dish */}
            <path
              d="M 242,84 Q 250,92 258,84"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            <line x1="250" y1="84" x2="250" y2="93" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="250" cy="94" r="2.5" fill="#34d399" />
          </g>
        </g>

        {/* Coastline / Mangrove Silhouette Below */}
        <g>
          {/* Water Area with Subtle Wave */}
          <path
            d="M 0,335 C 100,328 200,342 300,332 C 400,322 450,338 500,330 L 500,380 L 0,380 Z"
            fill="url(#waterGrad)"
          />

          {/* Mangrove Shoreline Landmass */}
          <path
            d="M 0,345 C 80,335 150,350 240,338 C 340,325 420,345 500,335 L 500,380 L 0,380 Z"
            fill="url(#coastGrad)"
          />

          {/* Mangrove Trees Silhouette */}
          {/* Tree 1 (Left) */}
          <g fill="#042f2e" stroke="#042f2e">
            {/* Trunk & Arching Roots */}
            <path d="M 120,338 Q 125,320 128,302 Q 131,320 138,338" fill="none" strokeWidth="3" />
            <path d="M 115,340 Q 124,328 128,310 Q 132,328 143,340" fill="none" strokeWidth="2" />
            {/* Canopy Clusters */}
            <circle cx="128" cy="290" r="19" />
            <circle cx="116" cy="298" r="14" />
            <circle cx="140" cy="296" r="15" />
            <circle cx="128" cy="278" r="14" fill="#065f46" />
          </g>

          {/* Tree 2 (Center) */}
          <g fill="#042f2e" stroke="#042f2e">
            {/* Roots */}
            <path d="M 235,338 Q 248,315 250,290 Q 252,315 265,338" fill="none" strokeWidth="3.5" />
            <path d="M 226,340 Q 242,325 250,300 Q 258,325 274,340" fill="none" strokeWidth="2.5" />
            {/* Canopy Clusters */}
            <circle cx="250" cy="275" r="24" />
            <circle cx="232" cy="285" r="18" />
            <circle cx="268" cy="283" r="19" />
            <circle cx="250" cy="260" r="18" fill="#065f46" />
          </g>

          {/* Tree 3 (Right) */}
          <g fill="#042f2e" stroke="#042f2e">
            {/* Roots */}
            <path d="M 360,336 Q 370,320 373,304 Q 376,320 386,336" fill="none" strokeWidth="3" />
            <path d="M 354,338 Q 366,326 373,312 Q 380,326 392,338" fill="none" strokeWidth="2" />
            {/* Canopy Clusters */}
            <circle cx="373" cy="292" r="18" />
            <circle cx="360" cy="300" r="13" />
            <circle cx="386" cy="298" r="14" />
            <circle cx="373" cy="280" r="13" fill="#065f46" />
          </g>

          {/* Small GPS Sensor Pins on Ground */}
          <g transform="translate(180, 298)">
            <circle cx="0" cy="0" r="4" fill="#34d399" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.6">
              <animate attributeName="r" values="4;12" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          <g transform="translate(320, 292)">
            <circle cx="0" cy="0" r="4" fill="#2dd4bf" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.6">
              <animate attributeName="r" values="4;12" dur="2.3s" begin="0.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2.3s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Animated counter with Indian Number Formatting
───────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(end / 45));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 24);
    return () => clearInterval(timer);
  }, [end]);

  return <span>{count.toLocaleString('en-IN')}{suffix}</span>;
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Check auth state from context or localStorage
  const hasToken =
    isAuthenticated ||
    (typeof window !== 'undefined' &&
      !!(
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('authToken')
      ));

  // FIX 3: Real live data stats
  const [statsData, setStatsData] = useState({
    totalHectares: 0,
    activeProjects: 0,
    creditsIssued: 0,
    ipfsRecords: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const [projectsData, txData] = await Promise.all([
          apiFetch('/CarbonLedger/').catch(() => []),
          apiFetch('/CarbonLedgerTransactions/').catch(() => []),
        ]);

        const projects = Array.isArray(projectsData) ? projectsData : [];
        const txs = Array.isArray(txData) ? txData : [];

        // 1. Total Hectares Monitored = sum of estimated_area_hectares
        const totalHectares = projects.reduce(
          (sum: number, p: any) => sum + (parseFloat(p.estimated_area_hectares) || 0),
          0
        );

        // 2. Active Projects = count of Verified projects
        const activeProjects = projects.filter(
          (p: any) => p.status === 'Verified' || (p.active && !p.status)
        ).length;

        // 3. Credits Issued = sum of expected_carbon_sequestration or transaction credits
        const creditsIssued = projects.reduce(
          (sum: number, p: any) => sum + (parseFloat(p.expected_carbon_sequestration) || 0),
          0
        );

        // 4. IPFS Records = count of projects/transactions with non-null IPFS CID
        const ipfsCount =
          txs.filter((t: any) => t.ipfs_cid).length +
          projects.filter((p: any) => p.ipfs_cid).length;

        setStatsData({
          totalHectares: Math.round(totalHectares),
          activeProjects: activeProjects || projects.length,
          creditsIssued: Math.round(creditsIssued),
          ipfsRecords: ipfsCount || txs.length,
        });
        setStatsError(false);
      } catch {
        setStatsError(true);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  /* ─────────────────────────────────────────────
     FIX 5: 6 Feature Cards with 48x48 SVG stroke-based icons
  ───────────────────────────────────────────── */
  const features = [
    {
      title: 'Global Reach',
      description: 'Connect coastal restoration projects worldwide and track their impact in real-time.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
          <path d="M16 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor" />
          <path d="M8 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      title: 'Real-time Analytics',
      description: 'Monitor carbon sequestration with satellite-backed data visualization.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
          <path d="M14 9h5v5" />
        </svg>
      ),
    },
    {
      title: 'Monetize Impact',
      description: 'Convert verified blue carbon credits into on-chain tradeable assets.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          <path d="M14 7h4v4" />
          <path d="M18 7l-5 5" />
        </svg>
      ),
    },
    {
      title: 'Carbon Tracking',
      description: 'Track carbon sequestration lifecycle from mangrove canopy to on-chain ledger.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Molecule structure */}
          <circle cx="12" cy="12" r="4" />
          <circle cx="19" cy="6" r="2.5" />
          <circle cx="5" cy="18" r="2.5" />
          <circle cx="6" cy="6" r="2.5" />
          <line x1="14.8" y1="9.2" x2="17.2" y2="7.3" />
          <line x1="9.2" y1="14.8" x2="6.8" y2="16.7" />
          <line x1="9.5" y1="9.5" x2="7.5" y2="7.5" />
        </svg>
      ),
    },
    {
      title: 'Verification Shield',
      description: 'Every credit is minted on-chain and pinned to IPFS for immutable provenance.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: 'Fast Settlement',
      description: 'Automated verification workflows and instant smart contract credit settlement.',
      icon: (
        <svg
          className="w-12 h-12 text-[#0d3b3b]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
  ];

  /* ─────────────────────────────────────────────
     FIX 10: How It Works 5 Steps
  ───────────────────────────────────────────── */
  const steps = [
    {
      number: '01',
      title: 'Register Project',
      description: 'Submit your coastal restoration project with GPS coordinates',
      icon: (
        <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Satellite Analysis',
      description: 'Our AI analyses Sentinel-2 imagery to calculate NDVI and estimate carbon sequestration',
      icon: (
        <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 7 9 3 5 7l4 4" />
          <path d="m17 11 4 4-4 4-4-4" />
          <path d="m8 12 4 4 6-6-4-4Z" />
          <path d="m16 8 3-3" />
          <path d="M9 21a6 6 0 0 0-6-6" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'MRV Verification',
      description: 'A certified verifier approves the carbon data and signs the MRV report on-chain',
      icon: (
        <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'Mint Credits',
      description: 'Verified carbon credits are minted as tokens on Polygon blockchain',
      icon: (
        <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          <path d="M7 6h2v4H7z" />
        </svg>
      ),
    },
    {
      number: '05',
      title: 'Trade & Retire',
      description: 'Sell credits on the marketplace or retire them to claim your carbon offset',
      icon: (
        <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── FIX 8: Hero Section (Compact height for 1080p above-the-fold visibility) ── */}
      <section className="relative overflow-hidden bg-[#0c4a6e]">
        <OceanHeroSVG />

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="md:col-span-7 max-w-xl">
              {/* FIX 6: Simple subtle text tag */}
              <p className="text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide mb-3 flex items-center gap-1.5">
                <span>🌊</span> Built for India's Coastal Ecosystems
              </p>

              {/* FIX 7: Heading "Measure Your Coastal Impact" */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                Measure Your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
                  Coastal Impact
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/90 mb-8 leading-relaxed">
                The Blue Carbon Registry connects coastal restoration projects with AI-powered satellite analysis,
                blockchain credit issuance, and real-time MRV verification.
              </p>

              {/* FIX 1: Conditional CTA buttons based on auth state */}
              <div className="flex flex-wrap gap-4">
                {hasToken ? (
                  <Button
                    id="hero-go-dashboard"
                    size="lg"
                    onClick={() => setLocation('/dashboard')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 shadow-lg shadow-emerald-950/40 text-sm h-11"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      id="hero-get-started"
                      size="lg"
                      onClick={() => setLocation('/register')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 shadow-lg shadow-emerald-950/40 text-sm h-11"
                    >
                      Get Started
                    </Button>
                    <Button
                      id="hero-sign-in"
                      size="lg"
                      variant="outline"
                      onClick={() => setLocation('/login')}
                      className="border-white text-white hover:bg-white/15 bg-transparent backdrop-blur-xs text-sm h-11 px-6"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* FIX 2: Right Animated Hero Satellite & Coastline Illustration */}
            <div className="hidden md:col-span-5 md:flex items-center justify-center">
              <HeroSatelliteIllustration />
            </div>

          </div>
        </div>
      </section>

      {/* ── FIX 3: Live Statistics Row ── */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-6 md:py-8 border-y border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Stat 1 */}
            <div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                {loadingStats ? (
                  <span className="inline-block w-20 h-8 bg-slate-700 animate-pulse rounded"></span>
                ) : statsError ? (
                  <span>0 <span className="text-xs text-slate-400 font-normal">—</span></span>
                ) : (
                  <AnimatedCounter end={statsData.totalHectares} suffix=" ha" />
                )}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Total Hectares Monitored</p>
            </div>

            {/* Stat 2 */}
            <div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                {loadingStats ? (
                  <span className="inline-block w-16 h-8 bg-slate-700 animate-pulse rounded"></span>
                ) : statsError ? (
                  <span>0 <span className="text-xs text-slate-400 font-normal">—</span></span>
                ) : (
                  <AnimatedCounter end={statsData.activeProjects} />
                )}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Active Projects</p>
            </div>

            {/* Stat 3 */}
            <div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                {loadingStats ? (
                  <span className="inline-block w-24 h-8 bg-slate-700 animate-pulse rounded"></span>
                ) : statsError ? (
                  <span>0 <span className="text-xs text-slate-400 font-normal">—</span></span>
                ) : (
                  <AnimatedCounter end={statsData.creditsIssued} />
                )}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Credits Issued</p>
            </div>

            {/* Stat 4 */}
            <div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                {loadingStats ? (
                  <span className="inline-block w-16 h-8 bg-slate-700 animate-pulse rounded"></span>
                ) : statsError ? (
                  <span>0 <span className="text-xs text-slate-400 font-normal">—</span></span>
                ) : (
                  <AnimatedCounter end={statsData.ipfsRecords} />
                )}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">IPFS Records</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FIX 4 & FIX 5: Features Section (60px padding, clean stroke icons) ── */}
      <section className="bg-slate-50 py-[60px]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Powerful Tools for Climate Action
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to measure, verify, and monetize your blue carbon impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FIX 10: How It Works Section ── */}
      <section className="bg-[#f8fafa] py-16 border-t border-slate-200/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d3b3b] mb-3">
              How CarbonLedger Works
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              From coastline to carbon credit in 5 steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center">
                {/* Horizontal Arrow Line between steps on desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-1/2 w-full h-[2px] bg-teal-200 z-0">
                    <div className="absolute right-0 -top-1.5 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-teal-400" />
                  </div>
                )}

                {/* Step Circle & Icon */}
                <div className="relative z-10 w-14 h-14 rounded-full bg-white border-2 border-teal-500 shadow-sm flex items-center justify-center mb-4">
                  {step.icon}
                </div>

                {/* Step Number */}
                <span className="text-xs font-bold text-[#0d3b3b] tracking-wider uppercase mb-1">
                  Step {step.number}
                </span>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed max-w-[210px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c4a6e] via-[#0d3b3b] to-[#064e3b] py-16">
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-base sm:text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
            Join organizations measuring and monetizing their blue carbon impact.
            Start your first project in minutes — no blockchain expertise required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              id="cta-start-project"
              size="lg"
              onClick={() => setLocation(hasToken ? '/projects' : '/register')}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 shadow-lg text-sm"
            >
              Start Your Project Today
            </Button>
            <Button
              id="cta-marketplace"
              size="lg"
              variant="outline"
              onClick={() => setLocation('/marketplace')}
              className="border-white text-white hover:bg-white/10 bg-transparent text-sm"
            >
              Browse Marketplace
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}

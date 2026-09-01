import { useLocation } from 'wouter';
import logoFull from '@/assets/logo-full.svg';

export default function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="bg-[#0d3b3b] text-white border-t border-[#1a5c45]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-start">
          {/* Left Side */}
          <div className="space-y-3">
            <div className="flex items-center cursor-pointer" onClick={() => setLocation('/')}>
              <img src={logoFull} alt="CarbonLedger" className="h-9 w-auto" />
            </div>
            <p className="text-sm text-[#80cbc4] font-medium">
              Blockchain-powered Blue Carbon MRV Platform
            </p>
            <p className="text-xs text-slate-300">
              Built for Smart India Hackathon 2026
            </p>
          </div>

          {/* Center: Quick Links */}
          <div className="text-left md:text-center">
            <h4 className="font-semibold text-white mb-3 text-sm tracking-wider uppercase">
              Quick Links
            </h4>
            <div className="flex flex-wrap md:justify-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <button onClick={() => setLocation('/')} className="hover:text-[#80cbc4] transition-colors">
                Home
              </button>
              <span className="text-slate-500 hidden md:inline">|</span>
              <button onClick={() => setLocation('/dashboard')} className="hover:text-[#80cbc4] transition-colors">
                Dashboard
              </button>
              <span className="text-slate-500 hidden md:inline">|</span>
              <button onClick={() => setLocation('/marketplace')} className="hover:text-[#80cbc4] transition-colors">
                Marketplace
              </button>
              <span className="text-slate-500 hidden md:inline">|</span>
              <button onClick={() => setLocation('/reports')} className="hover:text-[#80cbc4] transition-colors">
                Reports
              </button>
              <span className="text-slate-500 hidden md:inline">|</span>
              <button onClick={() => setLocation('/projects')} className="hover:text-[#80cbc4] transition-colors">
                Register Project
              </button>
            </div>
          </div>

          {/* Right Side: Powered By */}
          <div className="text-left md:text-right space-y-2">
            <h4 className="font-semibold text-white mb-2 text-sm tracking-wider uppercase">
              Powered By
            </h4>
            <div className="flex flex-wrap md:justify-end gap-2 text-xs text-[#80cbc4] font-mono">
              <span className="px-2.5 py-1 bg-[#1a5c45] rounded-md text-white border border-[#2d7d60]">
                Polygon
              </span>
              <span className="px-2.5 py-1 bg-[#1a5c45] rounded-md text-white border border-[#2d7d60]">
                IPFS
              </span>
              <span className="px-2.5 py-1 bg-[#1a5c45] rounded-md text-white border border-[#2d7d60]">
                Google Earth Engine
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1a5c45] pt-6 text-center text-xs text-slate-300">
          <p>© 2026 CarbonLedger. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}


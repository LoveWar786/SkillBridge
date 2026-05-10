import React, { useState, useRef, useEffect } from 'react';
import { JobContext } from '../types';
import { Building2, Globe, ArrowRight, Zap, Brain, Rocket, Info, ChevronDown, Coins, AlertCircle, Search, Save } from 'lucide-react';

interface StepJobProps {
  onAnalyze: (jobContext: JobContext) => void;
  onBack: () => void;
  credits: number;
  onBuyCredits: () => void;
  isGuest: boolean;
  onSaveDraft?: (jobContext: JobContext) => void;
  isSavingDraft?: boolean;
  initialContext?: JobContext;
}

const COMMON_ROLES = [
  // Tech & Engineering
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Developer",
  "Mobile Developer (iOS/Android)",
  "DevOps Engineer",
  "Cloud Architect",
  "QA Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cybersecurity Analyst",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  
  // Business & Management
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "Marketing Manager",
  "Sales Representative",
  "Human Resources Manager",
  "Financial Analyst",
  "Accountant",
  "Operations Manager",
  "Logistics Manager",
  "Supply Chain Coordinator",
  
  // Creative & Design
  "UX/UI Designer",
  "Graphic Designer",
  "Content Writer / Copywriter",
  "Video Editor",
  "Social Media Manager",
  "Architect",
  
  // Healthcare
  "Registered Nurse",
  "Medical Doctor",
  "Pharmacist",
  "Physical Therapist",
  "Healthcare Administrator",
  
  // Education
  "Teacher (K-12)",
  "University Professor",
  "Education Administrator",
  "Corporate Trainer",
  
  // Administrative & Support
  "Administrative Assistant",
  "Office Manager",
  "Executive Assistant",
  "Customer Service Representative",
  "Receptionist",
  
  // Legal
  "Lawyer / Legal Counsel",
  "Paralegal",
  "Compliance Officer",
  
  // Other Industries
  "Real Estate Agent",
  "Retail Manager",
  "Construction Project Manager",
  "Chef / Head Cook",
  "Hospitality Manager"
];

const StepJob: React.FC<StepJobProps> = ({ onAnalyze, onBack, credits, onBuyCredits, isGuest, onSaveDraft, isSavingDraft, initialContext }) => {
  const [role, setRole] = useState(initialContext?.role || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<'Generalized' | 'CompanySpecific'>(initialContext?.type || 'Generalized');
  const [companyName, setCompanyName] = useState(initialContext?.companyName || '');
  const [description, setDescription] = useState(initialContext?.description || '');
  const [modelSpeed, setModelSpeed] = useState<'fastest' | 'balanced' | 'deep'>(initialContext?.modelSpeed || 'balanced');

  useEffect(() => {
    if (initialContext) {
      setRole(initialContext.role || '');
      setType(initialContext.type || 'Generalized');
      setCompanyName(initialContext.companyName || '');
      setDescription(initialContext.description || '');
      setModelSpeed(initialContext.modelSpeed || 'balanced');
    }
  }, [initialContext]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRoles = COMMON_ROLES.filter(r => r.toLowerCase().includes(role.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (type === 'CompanySpecific' && !description) return;

    onAnalyze({ role, type, companyName, description, modelSpeed });
  };

  const loadExample = () => {
    setRole("Senior Frontend Engineer");
    setCompanyName("CloudScale Systems");
    setDescription(`We are looking for a Senior Frontend Engineer to join our core product team. 
  
Key Responsibilities:
- Lead the migration of our legacy dashboard to React 18 and Next.js.
- Implement complex data visualizations using D3.js or Recharts.
- Enforce strict TypeScript typing and maintain 90%+ unit test coverage with Vitest.
- Optimize application performance (Core Web Vitals) for global users.
- Collaborate with UX designers to build a consistent design system using Tailwind CSS.

Requirements:
- 5+ years of professional experience with modern JavaScript frameworks.
- Expert-level knowledge of React state management (TanStack Query, Redux Toolkit).
- Strong understanding of CI/CD pipelines and frontend deployment strategies.
- Experience with accessibility (WCAG) and responsive design.`);
    setType('CompanySpecific');
  };

  const getCost = (speed: 'fastest' | 'balanced' | 'deep') => {
    switch (speed) {
      case 'fastest': return 2;
      case 'balanced': return 3;
      case 'deep': return 5;
    }
  };

  const ANALYSIS_COST = getCost(modelSpeed);
  const hasEnoughCredits = credits >= ANALYSIS_COST;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Target Role</h2>
        <p className="text-slate-600 dark:text-slate-400">Tell us what job you are aiming for so we can find your gaps.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
        
        {/* Job Role Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Job Role Title</label>
            
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 p-3 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-400"
                  placeholder="Search or type a custom role..."
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  required
                />
                <ChevronDown className={`absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map(r => (
                      <button
                        key={r}
                        type="button"
                        className="w-full text-left px-4 py-3 text-white hover:bg-slate-700 dark:hover:bg-slate-900 transition-colors"
                        onClick={() => {
                          setRole(r);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {r}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-slate-400 text-sm">
                      No matches found. Press enter to use "{role}" as a custom role.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('Generalized')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                type === 'Generalized' 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${type === 'Generalized' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <span className={`font-bold ${type === 'Generalized' ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Generalized Role</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Benchmark against standard industry requirements for this role.</p>
            </button>

            <button
              type="button"
              onClick={() => setType('CompanySpecific')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                type === 'CompanySpecific' 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
               <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${type === 'CompanySpecific' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className={`font-bold ${type === 'CompanySpecific' ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Specific Company</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Compare against a specific job description.</p>
            </button>
          </div>

          {type === 'CompanySpecific' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Company Name (Optional)</label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-400"
                  placeholder="e.g., Google, Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Paste Job Description</label>
                  <button 
                    type="button"
                    onClick={loadExample}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    Try an example
                  </button>
                </div>
                <textarea
                  className="w-full p-3 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-400 min-h-[180px] text-sm leading-relaxed"
                  placeholder="Paste the full job description here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Model Speed Section */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Analysis Model</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => setModelSpeed('fastest')}
                    className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'fastest' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center">
                        Fastest analysis using Gemini 3.1 Flash Lite. Best for quick checks. Cost: 2 credits.
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45"></div>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-2">
                        <Rocket className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Fastest</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.1 Flash Lite</span>
                    <span className="mt-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 2
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setModelSpeed('balanced')}
                    className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'balanced' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center">
                        Balanced analysis using Gemini 3.0 Flash. Good mix of speed and depth. Cost: 3 credits.
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45"></div>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-2">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Balanced</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.0 Flash</span>
                    <span className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 3
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setModelSpeed('deep')}
                    className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'deep' 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center">
                        Deep reasoning using Gemini 3.1 Pro + Thinking. Best for complex roles. Cost: 5 credits.
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45"></div>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mb-2">
                        <Brain className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Deep Reasoning</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.1 Pro + Thinking</span>
                    <span className="mt-2 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 5
                    </span>
                </button>
            </div>
        </div>

        <div className="pt-4 flex flex-col gap-4">
            {/* Credit Balance & Cost Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Your Balance</span>
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-lg">
                            <Coins className="w-5 h-5 text-yellow-500" />
                            {credits}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Analysis Cost</span>
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-lg">
                            <Coins className="w-5 h-5" />
                            {ANALYSIS_COST}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center justify-center gap-2 transition-all hover:translate-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!role || (type === 'CompanySpecific' && !description) || !hasEnoughCredits}
                    >
                        <span>Start Analysis</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    {!hasEnoughCredits && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Insufficient credits
                            </span>
                            {!isGuest && (
                                <button
                                    type="button"
                                    onClick={onBuyCredits}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Buy More
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex justify-start items-center gap-4">
              <button 
                  type="button" 
                  onClick={onBack}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-4 py-2 flex items-center gap-2"
              >
                  ← Back
              </button>
              {onSaveDraft && (
                <button 
                    type="button"
                    onClick={() => onSaveDraft({ role, type, companyName, description, modelSpeed })}
                    disabled={isSavingDraft || !role}
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSavingDraft ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isGuest ? 'Login to Save Progress' : 'Save Progress as Draft'}
                </button>
              )}
            </div>
        </div>
      </form>
    </div>
  );
};

export default StepJob;
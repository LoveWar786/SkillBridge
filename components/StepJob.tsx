import React, { useState } from 'react';
import { JobContext } from '../types';
import { Building2, Globe, ArrowRight, Zap, Brain, Rocket, Info, ChevronDown, Coins } from 'lucide-react';

interface StepJobProps {
  onAnalyze: (jobContext: JobContext) => void;
  onBack: () => void;
  credits: number;
  onBuyCredits: () => void;
  isGuest: boolean;
}

const COMMON_ROLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Product Manager",
  "UX/UI Designer",
  "QA Engineer",
  "Mobile Developer (iOS/Android)",
  "Cloud Architect",
  "Cybersecurity Analyst",
  "Business Analyst",
  "Project Manager",
  "Marketing Manager",
  "Sales Representative",
  "Human Resources Manager"
];

const StepJob: React.FC<StepJobProps> = ({ onAnalyze, onBack, credits, onBuyCredits, isGuest }) => {
  const [role, setRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [type, setType] = useState<'Generalized' | 'CompanySpecific'>('Generalized');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [modelSpeed, setModelSpeed] = useState<'fastest' | 'balanced' | 'deep'>('balanced');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (type === 'CompanySpecific' && !description) return;

    onAnalyze({ role, type, companyName, description, modelSpeed });
  };

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'OTHER_CUSTOM') {
      setIsCustomRole(true);
      setRole('');
    } else {
      setIsCustomRole(false);
      setRole(value);
    }
  };

  const loadExample = () => {
    setIsCustomRole(true); // Example is usually specific
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
            
            {!isCustomRole ? (
                <div className="relative">
                    <select
                        className="w-full p-3 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white appearance-none cursor-pointer"
                        onChange={handleRoleSelect}
                        value={COMMON_ROLES.includes(role) ? role : ''}
                    >
                        <option value="" disabled>Select a role...</option>
                        {COMMON_ROLES.map(r => (
                            <option key={r} value={r} className="bg-slate-800 dark:bg-slate-950">{r}</option>
                        ))}
                        <option value="OTHER_CUSTOM" className="bg-slate-700 dark:bg-slate-900 font-bold text-blue-200">✨ Other / Add Custom Role</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            ) : (
                <div className="flex gap-2">
                     <input
                        type="text"
                        className="flex-1 p-3 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-400"
                        placeholder="e.g., Blockchain Developer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                        autoFocus
                    />
                    <button 
                        type="button"
                        onClick={() => { setIsCustomRole(false); setRole(''); }}
                        className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            )}
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
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'fastest' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-2">
                        <Rocket className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Fastest</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini Flash Lite</span>
                    <span className="mt-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 2
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setModelSpeed('balanced')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'balanced' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-2">
                        <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Balanced</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.0 Flash</span>
                    <span className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 3
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setModelSpeed('deep')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        modelSpeed === 'deep' 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mb-2">
                        <Brain className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Deep Reasoning</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.0 Pro + Thinking</span>
                    <span className="mt-2 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" /> 5
                    </span>
                </button>
            </div>
        </div>

        <div className="pt-4 flex flex-col gap-4">
            {!hasEnoughCredits && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center justify-between gap-3 text-red-700 dark:text-red-300">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5" />
                  <span className="text-sm font-medium">Insufficient credits. You need {ANALYSIS_COST} credits but only have {credits}.</span>
                </div>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={onBuyCredits}
                    className="text-xs font-bold bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Buy Credits
                  </button>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <button 
                  type="button" 
                  onClick={onBack}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-4"
              >
                  Back
              </button>
              <div className="flex flex-col items-end gap-2">
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center gap-2 transition-all hover:translate-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!role || (type === 'CompanySpecific' && !description) || !hasEnoughCredits}
                >
                    <span>Start Analysis</span>
                    <span className="bg-blue-500/50 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {ANALYSIS_COST}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  * Cost depends on selected model
                </p>
              </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default StepJob;
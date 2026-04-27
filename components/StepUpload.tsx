import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, ArrowRight, PenTool, Type } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import { parseCV, extractTextFromDocx } from '../services/geminiService';
import { UserProfile } from '../types';

interface StepUploadProps {
  onProfileLoaded: (profile: UserProfile) => void;
}

const StepUpload: React.FC<StepUploadProps> = ({ onProfileLoaded }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');

  // Load saved text on mount
  useEffect(() => {
    const savedText = localStorage.getItem('skillBridge_manualText');
    if (savedText) {
      setManualText(savedText);
    }
  }, []);

  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setManualText(newValue);
    localStorage.setItem('skillBridge_manualText', newValue);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Supported Types
    const validTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/webp', 
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid PDF, Image, DOCX, or Text file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        reader.onload = async (e) => {
          try {
             const arrayBuffer = e.target?.result as ArrayBuffer;
             if (!arrayBuffer) throw new Error("Could not read file.");
             
             const extractedText = await extractTextFromDocx(arrayBuffer);
             const base64Text = btoa(unescape(encodeURIComponent(extractedText)));
             const profile = await parseCV(base64Text, 'text/plain');
             onProfileLoaded(profile);
          } catch (err: any) {
             setError(err.message || "Failed to read DOCX file.");
             setIsUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = async (e) => {
          const result = e.target?.result as string;
          if (!result) {
            setError("Could not read file.");
            setIsUploading(false);
            return;
          }
          const base64String = result.split(',')[1];
          try {
            const profile = await parseCV(base64String, file.type);
            onProfileLoaded(profile);
          } catch (err: any) {
            setError(err.message || "AI could not extract profile. Please ensure the file is valid.");
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      }
      
      reader.onerror = () => {
        setError("Error reading file.");
        setIsUploading(false);
      };

    } catch (err) {
      setError("Something went wrong.");
      setIsUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      const base64String = btoa(unescape(encodeURIComponent(manualText)));
      const profile = await parseCV(base64String, 'text/plain');
      onProfileLoaded(profile);
    } catch (err: any) {
      setError(err.message || "AI could not analyze the text.");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Bridge Your <span className="text-blue-600 dark:text-blue-400">Skill Gaps</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Analyze your current skills against industry standards or specific job descriptions to find exactly what you're missing.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-blue-200 dark:hover:border-blue-800">
        
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          <button
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'upload' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload CV / Profile
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'manual' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Enter Skills Manually
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center space-y-4">
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Extracting skills from document...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800 dark:text-white">Click to Upload or Drag & Drop</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDF, DOCX, Images, or Text</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Paste your Bio, Skills, Projects, or Resume Text
              </label>
              <textarea
                value={manualText}
                onChange={handleManualTextChange}
                placeholder="Example: I am a Frontend Developer with 3 years of experience. I know React, TypeScript, and Tailwind CSS. I have worked on e-commerce projects..."
                className="w-full h-48 p-4 bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-white placeholder:text-slate-400 text-sm"
                disabled={isUploading}
              />
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={!manualText.trim() || isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Skills...
                </>
              ) : (
                <>
                  Analyze My Skills
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
        
        {error && (
          <div className="mt-6 text-left">
            <ErrorMessage 
              title="Upload Error"
              message={error}
              variant="error"
              onClose={() => setError(null)}
              solutions={[
                "Ensure the file is a valid PDF, DOCX, or Image",
                "Check if the file is corrupted",
                "Try copy-pasting the text manually"
              ]}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span>Profile Parsing</span>
        </div>
        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        <div className="flex items-center gap-2">
            <span className="font-bold">Gemini 3.0</span>
            <span>Reasoning</span>
        </div>
      </div>
    </div>
  );
};

export default StepUpload;
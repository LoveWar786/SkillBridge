import React, { useState } from 'react';
import { UserProfile, Skill, SkillLevel } from '../types';
import { CheckCircle2, Award, Briefcase, Trash2, Plus, GripVertical, ArrowRight, Eye, PenLine } from 'lucide-react';

interface StepProfileProps {
  profile: UserProfile;
  onConfirm: (updatedProfile: UserProfile) => void;
  onBack: () => void;
}

const StepProfile: React.FC<StepProfileProps> = ({ profile, onConfirm, onBack }) => {
  // 'edit' allows changes, 'preview' shows the final confirm screen
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editedProfile, setEditedProfile] = useState<UserProfile>(JSON.parse(JSON.stringify(profile)));

  const handleFieldChange = (field: keyof UserProfile, value: string | number) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillChange = (index: number, field: keyof Skill, value: string) => {
    const newSkills = [...editedProfile.skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setEditedProfile(prev => ({ ...prev, skills: newSkills }));
  };

  const removeSkill = (index: number) => {
    const newSkills = editedProfile.skills.filter((_, i) => i !== index);
    setEditedProfile(prev => ({ ...prev, skills: newSkills }));
  };

  const addSkill = () => {
    const newSkill: Skill = {
      name: 'New Skill',
      category: 'Technical',
      level: SkillLevel.BEGINNER,
      evidence: ''
    };
    setEditedProfile(prev => ({ ...prev, skills: [newSkill, ...prev.skills] }));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case SkillLevel.ADVANCED: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case SkillLevel.INTERMEDIATE: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // --- PREVIEW MODE RENDER ---
  if (viewMode === 'preview') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Final Profile Review</h2>
          <p className="text-slate-600 dark:text-slate-400">This is how the AI will see you. Looks good?</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header / Summary */}
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{editedProfile.fullName || 'Candidate'}</h3>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
                            <Briefcase className="w-4 h-4" />
                            <span className="font-medium">{editedProfile.experienceYears} Years Experience</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                            {editedProfile.summary}
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                            <Award className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Skills Grid */}
            <div className="p-8">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Confirmed Skills</h4>
                <div className="flex flex-wrap gap-2">
                    {editedProfile.skills.map((skill, idx) => (
                        <div 
                            key={idx} 
                            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold flex items-center gap-2 ${getLevelColor(skill.level)}`}
                        >
                            <span>{skill.name}</span>
                            <span className="opacity-50 text-xs border-l border-current pl-2 ml-1">{skill.category}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex justify-between pt-4">
            <button 
                onClick={() => setViewMode('edit')}
                className="px-6 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors flex items-center gap-2"
            >
                <PenLine className="w-4 h-4" />
                Edit Again
            </button>
            <button 
                onClick={() => onConfirm(editedProfile)}
                className="px-8 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-green-900/30 transition-all flex items-center gap-2 hover:translate-x-1"
            >
                Confirm & Continue
                <CheckCircle2 className="w-5 h-5" />
            </button>
        </div>
      </div>
    );
  }

  // --- EDIT MODE RENDER ---
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Review & Edit Profile</h2>
        <p className="text-slate-600 dark:text-slate-400">Ensure your details are accurate for the best analysis results.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                    type="text"
                    value={editedProfile.fullName || ''}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    className="w-full text-xl font-bold text-slate-800 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none py-1 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    placeholder="Candidate Name"
                />
            </div>
            
            {/* Experience - Black Box with White Text */}
            <div className="w-full md:w-48">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Experience (Years)</label>
                <div className="relative bg-slate-800 dark:bg-slate-950 rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                        type="number"
                        min="0"
                        max="50"
                        value={editedProfile.experienceYears || 0}
                        onChange={(e) => handleFieldChange('experienceYears', parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white font-bold outline-none placeholder:text-slate-500"
                    />
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
            </div>
          </div>
          
          {/* Summary - Black Box with White Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Professional Summary</label>
            <div className="bg-slate-800 dark:bg-slate-950 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <textarea
                    value={editedProfile.summary || ''}
                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                    className="w-full p-3 bg-transparent text-white text-sm leading-relaxed min-h-[100px] outline-none placeholder:text-slate-500 resize-y"
                    placeholder="Brief summary of your professional background..."
                />
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Detected Skills ({editedProfile.skills.length})
            </h4>
            <button
                onClick={addSkill}
                className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add Skill
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {editedProfile.skills.map((skill, idx) => (
              <div key={idx} className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
                <div className="hidden sm:block text-slate-300 dark:text-slate-600 cursor-move">
                    <GripVertical className="w-5 h-5" />
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                    {/* Skill Name */}
                    <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 sm:hidden">Skill Name</label>
                        <input
                            type="text"
                            value={skill.name}
                            onChange={(e) => handleSkillChange(idx, 'name', e.target.value)}
                            className="w-full font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-slate-50 dark:focus:bg-slate-900 outline-none px-1 py-0.5 transition-colors placeholder:text-slate-300"
                            placeholder="Skill Name"
                        />
                    </div>
                    
                    {/* Category */}
                    <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 sm:hidden">Category</label>
                        <select
                            value={skill.category}
                            onChange={(e) => handleSkillChange(idx, 'category', e.target.value)}
                            className="w-full text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 focus:border-blue-500 outline-none"
                        >
                            <option value="Technical" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">Technical</option>
                            <option value="Soft" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">Soft</option>
                            <option value="Tool" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">Tool</option>
                            <option value="Domain" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">Domain</option>
                        </select>
                    </div>

                    {/* Level */}
                    <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 sm:hidden">Level</label>
                        <select
                            value={skill.level}
                            onChange={(e) => handleSkillChange(idx, 'level', e.target.value)}
                            className={`w-full text-xs font-bold border rounded-md px-2 py-1.5 focus:border-blue-500 outline-none ${
                                skill.level === 'Advanced' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' :
                                skill.level === 'Intermediate' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
                                'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <option value={SkillLevel.BEGINNER} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">Beginner</option>
                            <option value={SkillLevel.INTERMEDIATE} className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400">Intermediate</option>
                            <option value={SkillLevel.ADVANCED} className="bg-white dark:bg-slate-900 text-green-600 dark:text-green-400">Advanced</option>
                        </select>
                    </div>

                    {/* Evidence */}
                    <div className="sm:col-span-2 hidden sm:block">
                         <input 
                            type="text"
                            value={skill.evidence || ''}
                            onChange={(e) => handleSkillChange(idx, 'evidence', e.target.value)}
                            className="w-full text-xs text-slate-400 dark:text-slate-500 bg-transparent italic border-b border-transparent focus:border-blue-500 outline-none px-1 py-0.5"
                            placeholder="Evidence..."
                            title="Evidence for this skill"
                         />
                    </div>
                </div>

                <button 
                    onClick={() => removeSkill(idx)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remove Skill"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {editedProfile.skills.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-400">No skills listed. Add some to get started.</p>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button 
            onClick={onBack}
            className="px-6 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
        >
            Back to Upload
        </button>
        <button 
            onClick={() => setViewMode('preview')}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all flex items-center gap-2 hover:translate-x-1"
        >
            Next
            <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default StepProfile;
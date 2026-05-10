import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  darkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = "", darkMode = false, size = 'md' }) => {
  const iconSize = {
    sm: 'h-8 w-8',
    md: 'h-14 w-14',
    lg: 'h-20 w-20'
  }[size];

  const titleSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }[size];

  const subtitleSize = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-[12px]'
  }[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="relative flex-shrink-0">
        <img 
          src={darkMode ? "/favicon-dark.svg" : "/favicon.svg"} 
          alt="SkillBridge Icon" 
          className={`${iconSize} object-contain drop-shadow-xl`}
        />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <span className={`${titleSize} font-black tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          SkillBridge
        </span>
        <span className={`${subtitleSize} font-bold tracking-[0.25em] uppercase mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          AI Career Intelligence
        </span>
      </div>
    </div>
  );
};

export default Logo;

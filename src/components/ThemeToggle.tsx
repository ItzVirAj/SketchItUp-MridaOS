import React from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-between p-1 w-14 h-7 rounded-full cursor-pointer transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#079455] select-none ${
        isDark
          ? 'bg-[#2D332D] border border-[#3D453D] shadow-[0_0_12px_rgba(249,173,25,0.2)]'
          : 'bg-[#E0EAE4] border border-[#C5D7CC] shadow-inner'
      } ${className}`}
    >
      {/* Background Icons */}
      <span className="w-full flex items-center justify-between px-1 pointer-events-none">
        <Sun
          className={`w-3.5 h-3.5 transition-all duration-300 ${
            isDark ? 'text-[#8A9A8A] opacity-40 scale-75' : 'text-[#F9AD19] opacity-100 scale-100 rotate-0'
          }`}
        />
        <Moon
          className={`w-3.5 h-3.5 transition-all duration-300 ${
            isDark ? 'text-[#F9AD19] opacity-100 scale-100 rotate-0' : 'text-[#7A8B82] opacity-40 scale-75'
          }`}
        />
      </span>

      {/* Animated Sliding Thumb */}
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-spring shadow-md ${
          isDark
            ? 'translate-x-7 bg-[#1A1F1A] text-[#F9AD19] border border-[#4A524A]'
            : 'translate-x-0 bg-white text-[#079455] border border-[#CCD8D1]'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 transform transition-transform duration-300 rotate-12 fill-[#F9AD19]/20" />
        ) : (
          <Sun className="w-3.5 h-3.5 transform transition-transform duration-300 rotate-0 text-[#079455]" />
        )}
      </span>
    </button>
  );
};

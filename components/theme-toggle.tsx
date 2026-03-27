"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gray-200 animate-pulse" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Moon size={18} className="text-gray-600 dark:text-gray-300" />
        ) : (
          <Sun size={18} className="text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <button
              onClick={() => {
                setTheme("light");
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                theme === "light" ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <Sun size={16} />
              <span className="text-sm font-medium">Light</span>
              {theme === "light" && <span className="ml-auto">✓</span>}
            </button>
            
            <button
              onClick={() => {
                setTheme("dark");
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                theme === "dark" ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <Moon size={16} />
              <span className="text-sm font-medium">Dark</span>
              {theme === "dark" && <span className="ml-auto">✓</span>}
            </button>
            
            <button
              onClick={() => {
                setTheme("system");
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                theme === "system" ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <Monitor size={16} />
              <span className="text-sm font-medium">System</span>
              {theme === "system" && <span className="ml-auto">✓</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
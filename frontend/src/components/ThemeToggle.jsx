import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { IconMoon, IconSun } from './Icons';
import '../styles/ThemeToggle.css';

export function ThemeToggleInline({ className = '' }) {
      const { theme, toggleTheme } = useTheme();
      return (
            <button
                  type="button"
                  className={`theme-toggle-inline ${className}`}
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                  {theme === 'light' ? <IconMoon size={17} /> : <IconSun size={17} />}
            </button>
      );
}

function ThemeToggle({ variant = 'floating', className = '' }) {
      const { theme, toggleTheme } = useTheme();
      let location;
      try {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            location = useLocation();
      } catch (e) {
            location = { pathname: '/' };
      }

      // On pages with dedicated navbar toggle, hide floating toggle to prevent UI overlap
      const hasNavbarToggle = ['/dashboard', '/resume', '/admin'].some(path => (location?.pathname || '').startsWith(path));
      if (variant === 'floating' && hasNavbarToggle) {
            return null;
      }

      if (variant === 'inline') {
            return <ThemeToggleInline className={className} />;
      }

      return (
            <button
                  type="button"
                  className={`theme-toggle ${className}`}
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                  {theme === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
            </button>
      );
}

export default ThemeToggle;

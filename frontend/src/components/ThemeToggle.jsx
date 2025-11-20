import { useTheme } from '../hooks/useTheme';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-text-primary hover:text-primary transition-colors focus:outline-none rounded-lg hover:bg-surface/50"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
                {theme === 'light' ? (
                    <>
                        <FiMoon className="w-5 h-5" />
                        <span className="text-xs md:text-sm font-medium hidden sm:inline">Dark</span>
                    </>
                ) : (
                    <>
                        <FiSun className="w-5 h-5" />
                        <span className="text-xs md:text-sm font-medium hidden sm:inline">Light</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default ThemeToggle;

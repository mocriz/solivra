import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import PublicLanguageSwitcher from "./PublicLanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "react-i18next";

const PublicHeader = ({ showBackButton = true }) => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm bg-bg/95 border-b border-border">
      <div className="container mx-auto max-w-6xl px-5 py-4 flex justify-between items-center gap-4">
        {/* Left - Back Button or Logo */}
        <div className="flex items-center gap-4">
          {showBackButton ? (
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
              title={t("common.backToHome")}
            >
              <FiArrowLeft className="w-4 h-4" />
            </Link>
          ) : (
            <h1 className="text-2xl font-bold text-primary">Solivra</h1>
          )}
        </div>

        {/* Right - Language Switcher & Theme Toggle */}
        <div className="flex items-center gap-2">
          <PublicLanguageSwitcher />
          <div className="h-6 w-px bg-border/30"></div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;

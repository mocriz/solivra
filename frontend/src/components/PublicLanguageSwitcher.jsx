import { useContext, useState, useEffect } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";
import { FiGlobe, FiCheck } from "react-icons/fi";

const PublicLanguageSwitcher = () => {
  const { changeLanguage } = useContext(LanguageContext);
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "en", name: "English", flag: "🇺🇸" },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language);

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".language-dropdown")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="language-dropdown relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-text-primary hover:text-primary transition-colors focus:outline-none"
        title="Select Language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <FiGlobe className="w-5 h-5" />
        <span className="text-xs md:text-sm font-medium">{currentLanguage?.flag}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[180px]">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center justify-between w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors ${
                i18n.language === language.code
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-primary"
              }`}
              role="option"
              aria-selected={i18n.language === language.code}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
              </div>
              {i18n.language === language.code && (
                <FiCheck className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicLanguageSwitcher;

import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronDown, IoCheckmark } from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import { updateLanguagePreference } from "../api/users";

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const { userData, refreshData } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [isUpdating, setIsUpdating] = useState(false);

  const languages = [
    { code: "id", name: t("settings.languageOptions.id"), flag: "🇮🇩" },
    { code: "en", name: t("settings.languageOptions.en"), flag: "🇺🇸" },
    { code: "e1", name: t("settings.languageOptions.en"), flag: "🇺🇸" },
    { code: "e2", name: t("settings.languageOptions.en"), flag: "🇺🇸" },
    { code: "e3", name: t("settings.languageOptions.en"), flag: "🇺🇸" },
    { code: "e4", name: t("settings.languageOptions.en"), flag: "🇺🇸" },
  ];

  const currentLanguage = languages.find(
    (lang) => lang.code === selectedLanguage,
  );

  const handleLanguageChange = async (languageCode) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Update local state immediately for better UX
      await i18n.changeLanguage(languageCode);
      setSelectedLanguage(languageCode);
      localStorage.setItem("language", languageCode);
      setIsOpen(false);

      // Sync with server if user is authenticated
      if (userData) {
        try {
          await updateLanguagePreference(languageCode);
          // Refresh user data to sync across tabs/devices
          await refreshData({ silent: true });
        } catch (serverError) {
          console.error("Failed to sync language with server:", serverError);
          // Don't show error to user as local change succeeded
        }
      }

      // Show success message
      const toast = await import("react-hot-toast");
      toast.default.success(t("settings.languageUpdated"));
    } catch (error) {
      console.error("Failed to change language:", error);
      const toast = await import("react-hot-toast");
      toast.default.error(t("settings.languageError"));
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  // Sync with user preference on mount
  useEffect(() => {
    if (userData?.language_pref && userData.language_pref !== i18n.language) {
      i18n.changeLanguage(userData.language_pref);
      localStorage.setItem("language", userData.language_pref);
    }
  }, [userData?.language_pref, i18n]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".language-selector")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="language-selector relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center justify-between w-full px-3 py-2 text-left bg-surface border border-border rounded-lg hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{currentLanguage?.flag}</span>
          <span className="text-text-primary">{currentLanguage?.name}</span>
        </div>
        <IoChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={isUpdating}
              className={`flex items-center justify-between w-full px-3 py-3 text-left hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                selectedLanguage === language.code
                  ? "bg-primary/10 text-primary"
                  : "text-text-primary"
              }`}
              role="option"
              aria-selected={selectedLanguage === language.code}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
              </div>
              {selectedLanguage === language.code && (
                <IoCheckmark className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

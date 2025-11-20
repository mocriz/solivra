import { createContext, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

const LanguageContext = createContext();

const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "id";
  });

  // Initialize i18n with saved language
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const changeLanguage = useCallback((languageCode) => {
    i18n.changeLanguage(languageCode);
    setLanguage(languageCode);
    localStorage.setItem("language", languageCode);
  }, [i18n]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext, LanguageProvider };

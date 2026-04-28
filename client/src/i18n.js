import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_title": "CIVI Lens",
      "report_issue": "Report an Issue",
      "track_status": "Track Status",
      "sos_emergency": "SOS Emergency",
      "dashboard": "Dashboard",
      "select_language": "Select Language",
      "login": "Login",
      "welcome_message": "Empowering citizens for a better city.",
      "description": "Report civic issues directly to municipal authorities with AI-powered classification and tracking."
    }
  },
  hi: {
    translation: {
      "app_title": "CIVI Lens",
      "report_issue": "समस्या दर्ज करें",
      "track_status": "स्थिति ट्रैक करें",
      "sos_emergency": "आपातकालीन SOS",
      "dashboard": "डैशबोर्ड",
      "select_language": "भाषा चुनें",
      "login": "लॉगिन",
      "welcome_message": "बेहतर शहर के लिए नागरिकों को सशक्त बनाना।",
      "description": "एआई-संचालित वर्गीकरण और ट्रैकिंग के साथ नागरिक समस्याओं को सीधे नगर निगम अधिकारियों को रिपोर्ट करें।"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "ta";

const dict = {
  en: {
    appName: "MediScan AI",
    tagline: "Understand your medicines in plain English and Tamil.",
    heroSub: "Look up any medicine, keep a personal history with notes, and get calm AI summaries you can share with your doctor.",
    login: "Log in",
    register: "Create account",
    logout: "Log out",
    getStarted: "Get started",
    f1Title: "Medicine lookup",
    f1Body: "Uses, typical dosing, side effects and precautions — explained simply, in both languages.",
    f2Title: "Personal history",
    f2Body: "Every lookup is saved to a private timeline where you can add your own notes.",
    f3Title: "AI reports",
    f3Body: "Generate a neutral bilingual summary of the medicines you track, ready to print.",
    name: "Full name",
    email: "Email",
    password: "Password",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    checkEmail: "Account created. Check your email to confirm, then log in.",
    dashboard: "Dashboard",
    history: "History",
    reports: "Reports",
    admin: "Admin",
    hello: "Hello",
    searchLabel: "Search a medicine",
    searchPlaceholder: "e.g. Paracetamol",
    search: "Look up",
    searching: "Looking up…",
    totalLookups: "Total lookups",
    uniqueMeds: "Unique medicines",
    recent: "Recent lookups",
    noLookups: "No lookups yet. Search a medicine to begin.",
    uses: "Uses",
    dosage: "Dosage",
    sideEffects: "Side effects",
    precautions: "Precautions",
    disclaimer: "MediScan AI provides general information only and is not a substitute for advice from a licensed doctor or pharmacist.",
    notFound: "Medicine not found.",
    back: "Back",
    note: "Note",
    addNote: "Add a note…",
    save: "Save",
    saved: "Saved",
    pastReports: "Past reports",
    generate: "Generate new report",
    generating: "Generating…",
    noReports: "No reports yet.",
    view: "View",
    print: "Print / Save as PDF",
    report: "Report",
    profiles: "Profiles",
    medicines: "Cached medicines",
    role: "Role",
    joined: "Joined",
    del: "Delete",
    notAdmin: "Admins only.",
    genericError: "Something went wrong. Please try again.",
    loading: "Loading…",
    lang: "Language",
  },
  ta: {
    appName: "மெடிஸ்கேன் AI",
    tagline: "உங்கள் மருந்துகளை எளிய ஆங்கிலம் மற்றும் தமிழில் புரிந்துகொள்ளுங்கள்.",
    heroSub: "எந்த மருந்தையும் தேடுங்கள், குறிப்புகளுடன் தனிப்பட்ட வரலாற்றை வைத்திருங்கள், உங்கள் மருத்துவரிடம் பகிரக்கூடிய AI சுருக்கங்களைப் பெறுங்கள்.",
    login: "உள்நுழை",
    register: "கணக்கு உருவாக்கு",
    logout: "வெளியேறு",
    getStarted: "தொடங்குங்கள்",
    f1Title: "மருந்து தேடல்",
    f1Body: "பயன்கள், வழக்கமான அளவு, பக்க விளைவுகள், முன்னெச்சரிக்கைகள் — இரு மொழிகளிலும் எளிமையாக.",
    f2Title: "தனிப்பட்ட வரலாறு",
    f2Body: "ஒவ்வொரு தேடலும் உங்கள் குறிப்புகளுடன் தனிப்பட்ட காலவரிசையில் சேமிக்கப்படும்.",
    f3Title: "AI அறிக்கைகள்",
    f3Body: "நீங்கள் கண்காணிக்கும் மருந்துகளின் இருமொழி சுருக்கத்தை உருவாக்கி அச்சிடுங்கள்.",
    name: "முழு பெயர்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    noAccount: "கணக்கு இல்லையா?",
    haveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    checkEmail: "கணக்கு உருவாக்கப்பட்டது. உங்கள் மின்னஞ்சலை உறுதிசெய்து பின் உள்நுழையவும்.",
    dashboard: "முகப்பு",
    history: "வரலாறு",
    reports: "அறிக்கைகள்",
    admin: "நிர்வாகம்",
    hello: "வணக்கம்",
    searchLabel: "மருந்தைத் தேடுங்கள்",
    searchPlaceholder: "எ.கா. பாராசிட்டமால்",
    search: "தேடு",
    searching: "தேடுகிறது…",
    totalLookups: "மொத்த தேடல்கள்",
    uniqueMeds: "தனித்த மருந்துகள்",
    recent: "சமீபத்திய தேடல்கள்",
    noLookups: "இன்னும் தேடல்கள் இல்லை. தொடங்க ஒரு மருந்தைத் தேடுங்கள்.",
    uses: "பயன்கள்",
    dosage: "அளவு",
    sideEffects: "பக்க விளைவுகள்",
    precautions: "முன்னெச்சரிக்கைகள்",
    disclaimer: "மெடிஸ்கேன் AI பொதுவான தகவல்களை மட்டுமே வழங்குகிறது; இது உரிமம் பெற்ற மருத்துவர் அல்லது மருந்தாளரின் ஆலோசனைக்கு மாற்றாகாது.",
    notFound: "மருந்து கிடைக்கவில்லை.",
    back: "பின்செல்",
    note: "குறிப்பு",
    addNote: "குறிப்பு சேர்க்கவும்…",
    save: "சேமி",
    saved: "சேமிக்கப்பட்டது",
    pastReports: "முந்தைய அறிக்கைகள்",
    generate: "புதிய அறிக்கை உருவாக்கு",
    generating: "உருவாக்குகிறது…",
    noReports: "இன்னும் அறிக்கைகள் இல்லை.",
    view: "பார்",
    print: "அச்சிடு / PDF ஆக சேமி",
    report: "அறிக்கை",
    profiles: "பயனர்கள்",
    medicines: "சேமித்த மருந்துகள்",
    role: "பங்கு",
    joined: "சேர்ந்த நாள்",
    del: "நீக்கு",
    notAdmin: "நிர்வாகிகளுக்கு மட்டும்.",
    genericError: "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
    loading: "ஏற்றுகிறது…",
    lang: "மொழி",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("mediscan-lang");
    if (stored === "en" || stored === "ta") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("mediscan-lang", l);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("profiles").update({ preferred_lang: l }).eq("id", data.user.id).then(() => {});
    });
  }, []);

  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.en[k], [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

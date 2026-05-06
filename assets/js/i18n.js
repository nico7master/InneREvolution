/**
 * i18n — language detection & switching for InneREvolution
 *
 * Priority order:
 *   1. Explicit user choice (localStorage) — always respected
 *   2. URL path (/de/ → German) — respected
 *   3. Browser language (navigator.language) — auto-redirect on first visit only
 */
const i18n = {
    currentLang: "en",
    STORAGE_KEY: "innerevolution_lang",

    /**
     * Detect browser's primary language preference.
     * Returns "de" if the first (most preferred) language starts with "de",
     * otherwise "en".
     */
    detectBrowserLang: function () {
        var langs = navigator.languages || [];
        var primary = langs.length > 0 ? langs[0] : (navigator.language || navigator.userLanguage || "en");
        return primary.startsWith("de") ? "de" : "en";
    },

    /**
     * Initialise language from URL, localStorage, or browser preference.
     * On first visit with a German browser → auto-redirects to /de/.
     */
    init: function () {
        var path = window.location.pathname;
        var urlLang = (path.includes("/de/") || path.endsWith("/de")) ? "de" : "en";

        var storedLang = localStorage.getItem(this.STORAGE_KEY);

        if (storedLang && (storedLang === "en" || storedLang === "de")) {
            // User has explicitly chosen a language — always respect it
            this.currentLang = storedLang;
        } else {
            // First visit — check browser language preference
            var browserLang = this.detectBrowserLang();

            if (browserLang === "de" && urlLang !== "de") {
                // German browser on English URL → auto-redirect to German version
                localStorage.setItem(this.STORAGE_KEY, "de");
                document.documentElement.lang = "de";
                window.location.href = this.getUrlForLang("de");
                return this.currentLang;
            }

            // No redirect needed — use URL-based language
            this.currentLang = urlLang;

            // Persist the detected language so we don't re-detect on every page
            localStorage.setItem(this.STORAGE_KEY, this.currentLang);
        }

        document.documentElement.lang = this.currentLang;
        return this.currentLang;
    },

    getLang: function () {
        return this.currentLang;
    },

    setLang: function (l) {
        if (l !== "en" && l !== "de") return;
        this.currentLang = l;
        localStorage.setItem(this.STORAGE_KEY, l);
        document.documentElement.lang = l;
    },

    t: function (k) {
        if (typeof translations !== "undefined" && translations[this.currentLang] && translations[this.currentLang][k])
            return translations[this.currentLang][k];
        if (translations && translations.en && translations.en[k])
            return translations.en[k];
        return k;
    },

    getUrlForLang: function (l) {
        var p = window.location.pathname;
        if (l === "en") return p.replace(/\/de\//, "/").replace(/\/de$/, "");
        if (l === "de") return (p === "/" || p.endsWith("/index.html")) ? "/de/" : "/de" + p;
        return p;
    },

    switchTo: function (l) {
        this.setLang(l);
        window.location.href = this.getUrlForLang(l);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    i18n.init();
});

// Plain CommonJS so next.config.js can hash the inline script for the Content-Security-Policy.
// Any change to it changes the hash, which next.config.js recomputes on build.
const KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Inlined in _document so the right theme is set before the first paint.
const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||((!t||t==="system")&&matchMedia("${DARK_QUERY}").matches))document.documentElement.classList.add("dark")}catch(e){}`;

module.exports = { KEY, DARK_QUERY, THEME_SCRIPT };

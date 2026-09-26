import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// AnfragePilot ist praktisch vollständig dynamisch (Cookie-/Session-basiert
// über Supabase Auth) und nutzt kein ISR/SSG mit Revalidierung. Laut
// OpenNext-Doku ("SSR routes will work out of the box without any caching
// config") ist daher keine zusätzliche Incremental-Cache-Konfiguration
// (z. B. R2) nötig. Sollte künftig ISR/SSG mit `revalidate` eingeführt
// werden, muss hier ein `incrementalCache`-Override (R2/KV) ergänzt werden –
// siehe https://opennext.js.org/cloudflare/caching.
export default defineCloudflareConfig();

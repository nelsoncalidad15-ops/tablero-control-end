import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOOGLE_FETCH_TIMEOUT_MS = 30000;
const SHEET_CACHE_TTL_MS = 5 * 60 * 1000;
async function startServer() {
    const app = express();
    const sheetCache = new Map();
    const defaultAllowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://nelsoncalidad15-ops.github.io",
    ];
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultAllowedOrigins.join(","))
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);
    app.disable("x-powered-by");
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin not allowed by CORS: ${origin}`));
        },
        methods: ["GET", "OPTIONS"],
        allowedHeaders: ["Content-Type", "X-Requested-With", "Accept", "X-Dashboard-Password"],
        credentials: false,
    }));
    app.use((req, res, next) => {
        res.setHeader("Vary", "Origin");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Cache-Control", "no-store, max-age=0");
        res.setHeader("Pragma", "no-cache");
        next();
    });
    const PORT = Number(process.env.PORT || 3000);
    // Google Sheets API Setup
    const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").replace(/"/g, "").trim(),
        scopes: SCOPES
    });
    const sheets = google.sheets({ version: "v4", auth });
    const resolvedDetailedQualitySaltaUrl = process.env.LINK_REFUERZO_SLA_PUBLIC ||
        process.env.LINK_REFUERZO_SLA ||
        process.env.SHEET_URL_DETAILED_QUALITY_SALTA;
    const sheetUrls = {
        // Quality & Sales Quality
        sales_quality: process.env.LINK_ENCUESTAS_V || process.env.SHEET_URL_SALES_QUALITY,
        sales_claims: process.env.LINK_RECLAMOS_V || process.env.SHEET_URL_SALES_CLAIMS,
        cem_os: process.env.LINK_OS_JUJUY || process.env.SHEET_URL_CEM_OS,
        cem_os_salta: process.env.LINK_OS_SALTA || process.env.SHEET_URL_CEM_OS_SALTA,
        // Detailed Quality (Refuerzo)
        detailed_quality: process.env.LINK_REFUERZO_JJY || process.env.SHEET_URL_DETAILED_QUALITY,
        detailed_quality_salta: resolvedDetailedQualitySaltaUrl,
        // Postventa
        postventa: process.env.LINK_AVANCE_PPT || process.env.SHEET_URL_POSTVENTA,
        quality: process.env.LINK_RECLAMOS_PV || process.env.SHEET_URL_QUALITY,
        postventa_kpi: process.env.LINK_KPI_PV || process.env.SHEET_URL_POSTVENTA_KPI,
        postventa_kpis: process.env.LINK_KPI_PV || process.env.SHEET_URL_POSTVENTA_KPI,
        postventa_billing: process.env.LINK_FACTURACION || process.env.SHEET_URL_POSTVENTA_BILLING,
        internal_postventa: process.env.LINK_INTERNAL_POSTVENTA || process.env.SHEET_URL_INTERNAL_POSTVENTA,
        // Action Plan
        action_plan: process.env.LINK_PLAN_ACCION || process.env.SHEET_URL_ACTION_PLAN,
        action_plan_sales: process.env.LINK_PLAN_ACCION || process.env.SHEET_URL_ACTION_PLAN_SALES,
        // Others
        pcgc: process.env.SHEET_URL_PCGC,
        hr_grades: process.env.LINK_RRHH_NOTAS || process.env.SHEET_URL_HR_GRADES,
        hr_relatorio: process.env.LINK_RRHH_RELAT || process.env.SHEET_URL_HR_RELATORIO,
        hr_contacts: process.env.LINK_RRHH_CONTACTOS || process.env.SHEET_URL_HR_CONTACTS,
        hr_phases: process.env.LINK_RRHH_FASES || process.env.SHEET_URL_HR_PHASES,
        rrhh: process.env.SHEET_URL_RRHH || process.env.RRHH_URL,
        ventas: process.env.SHEET_URL_VENTAS || process.env.VENTAS_URL,
    };
    const allowedSheetNames = new Set(Object.keys(sheetUrls));
    const passwordProtected = process.env.IS_PASSWORD_PROTECTED === "true" && !!process.env.GLOBAL_PASSWORD;
    const dashboardPassword = (process.env.GLOBAL_PASSWORD || "").trim();
    console.log("[Debug] Current Working Directory:", process.cwd());
    // Helper to extract Spreadsheet ID and GID from URL
    const extractSheetInfo = (url) => {
        if (!url)
            return null;
        // If it's just an ID (no slashes), assume it's the Spreadsheet ID
        if (!url.includes('/')) {
            return { spreadsheetId: url, gid: '0' };
        }
        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gidMatch = url.match(/gid=([0-9]+)/);
        return {
            spreadsheetId: idMatch ? idMatch[1] : null,
            gid: gidMatch ? gidMatch[1] : '0'
        };
    };
    const isSpreadsheetId = (value) => /^[a-zA-Z0-9-_]{20,}$/.test(value);
    const isAllowedSheetUrl = (value) => {
        try {
            const parsed = new URL(value);
            return parsed.hostname === "docs.google.com" && parsed.pathname.includes("/spreadsheets/");
        }
        catch {
            return false;
        }
    };
    // Helper to convert 2D array from Google Sheets API to CSV string
    const arrayToCsv = (rows) => {
        return rows.map(row => row.map(cell => {
            const str = String(cell || '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')).join('\n');
    };
    const getCacheKey = (sheetName, resolvedUrl) => `${sheetName}::${resolvedUrl}`;
    const getFreshCacheEntry = (cacheKey) => {
        const entry = sheetCache.get(cacheKey);
        if (!entry)
            return null;
        if (Date.now() - entry.cachedAt > SHEET_CACHE_TTL_MS)
            return null;
        return entry;
    };
    const storeCacheEntry = (cacheKey, csv, source) => {
        sheetCache.set(cacheKey, {
            csv,
            cachedAt: Date.now(),
            contentType: "text/csv; charset=utf-8",
            source
        });
    };
    const sendCsvResponse = (res, csv, cacheStatus, source) => {
        res.setHeader("X-Cache-Status", cacheStatus);
        res.setHeader("X-Data-Source", source);
        res.setHeader("Cache-Control", "no-store, max-age=0");
        res.header("Content-Type", "text/csv; charset=utf-8");
        return res.send(csv);
    };
    const getProvidedPassword = (req) => (req.header("X-Dashboard-Password") || "").trim();
    const requireDashboardPassword = (req, res, next) => {
        if (!passwordProtected) {
            return next();
        }
        const providedPassword = getProvidedPassword(req);
        if (providedPassword && providedPassword === dashboardPassword) {
            return next();
        }
        return res.status(401).json({
            error: "Contraseña de acceso requerida.",
            passwordProtected: true,
        });
    };
    // Helper to normalize Google Sheets URLs to CSV export links (Legacy method)
    const normalizeSheetUrl = (url) => {
        if (!url)
            return url;
        if (url.includes('output=csv') || url.includes('/export') || url.includes('format=csv'))
            return url;
        // If it's only a Spreadsheet ID, convert it to a CSV export URL.
        if (isSpreadsheetId(url)) {
            return `https://docs.google.com/spreadsheets/d/${url}/export?format=csv&gid=0`;
        }
        if (url.includes('docs.google.com/spreadsheets')) {
            if (url.includes('/pub')) {
                const baseUrl = url.split('?')[0];
                const gidMatch = url.match(/gid=([0-9]+)/);
                const gid = gidMatch ? `&gid=${gidMatch[1]}` : '';
                return `${baseUrl}?output=csv${gid}`;
            }
            const info = extractSheetInfo(url);
            if (info?.spreadsheetId) {
                return `https://docs.google.com/spreadsheets/d/${info.spreadsheetId}/export?format=csv&gid=${info.gid}`;
            }
        }
        return url;
    };
    // API Route to proxy Google Sheets
    app.get("/api/auth/validate", (req, res) => {
        if (!passwordProtected) {
            return res.json({ passwordProtected: false, valid: true });
        }
        const providedPassword = getProvidedPassword(req);
        if (providedPassword && providedPassword === dashboardPassword) {
            return res.json({ passwordProtected: true, valid: true });
        }
        return res.status(401).json({ passwordProtected: true, valid: false });
    });
    app.get("/api/data/:sheetName", requireDashboardPassword, async (req, res) => {
        const sheetName = String(req.params.sheetName || "");
        let url = sheetUrls[sheetName];
        console.log(`[Proxy] Request for sheet: ${sheetName}`);
        if (!allowedSheetNames.has(sheetName)) {
            return res.status(404).json({ error: `La fuente "${sheetName}" no existe.` });
        }
        if (!url) {
            return res.status(400).json({ error: `Falta configurar el link de Google Sheets para "${sheetName}".` });
        }
        // Basic validation to prevent fetching invalid URLs like "Duquesa123"
        if (!isSpreadsheetId(url) && !isAllowedSheetUrl(url)) {
            console.error(`[Proxy] Invalid URL for ${sheetName}: ${url}`);
            return res.status(400).json({
                error: `El link configurado para "${sheetName}" no es vÃ¡lido.`,
                details: `Se recibiÃ³ "${url}" pero se esperaba un link de Google Sheets.`
            });
        }
        const cacheKey = getCacheKey(sheetName, url);
        const freshCacheEntry = getFreshCacheEntry(cacheKey);
        if (freshCacheEntry) {
            console.log(`[Cache] HIT for ${sheetName}`);
            return sendCsvResponse(res, freshCacheEntry.csv, "HIT", freshCacheEntry.source);
        }
        // Try Google Sheets API first if credentials are provided
        if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            try {
                const info = extractSheetInfo(url);
                if (info?.spreadsheetId) {
                    console.log(`[API] Fetching via Google Sheets API: ${info.spreadsheetId}`);
                    // Set a timeout for the Google API call
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout al conectar con Google Sheets API (${Math.round(GOOGLE_FETCH_TIMEOUT_MS / 1000)}s)`)), GOOGLE_FETCH_TIMEOUT_MS));
                    // Get spreadsheet metadata to find the sheet name for the GID
                    const spreadsheetPromise = sheets.spreadsheets.get({
                        spreadsheetId: info.spreadsheetId
                    });
                    const spreadsheet = await Promise.race([spreadsheetPromise, timeoutPromise]);
                    const sheet = spreadsheet.data.sheets?.find((s) => String(s.properties?.sheetId) === info.gid ||
                        (info.gid === '0' && s.properties?.index === 0));
                    const sheetNameInSpreadsheet = sheet?.properties?.title || 'Sheet1';
                    const resultPromise = sheets.spreadsheets.values.get({
                        spreadsheetId: info.spreadsheetId,
                        range: `${sheetNameInSpreadsheet}!A1:ZZ5000`, // Increased range to ZZ
                    });
                    const result = await Promise.race([resultPromise, timeoutPromise]);
                    const rows = result.data.values;
                    if (!rows || rows.length === 0) {
                        throw new Error("No se encontraron datos en la hoja especificada.");
                    }
                    const csvData = arrayToCsv(rows);
                    storeCacheEntry(cacheKey, csvData, "google_api");
                    return sendCsvResponse(res, csvData, "MISS", "google_api");
                }
            }
            catch (apiError) {
                console.error(`[API] Error using Google Sheets API for ${sheetName}:`, apiError.message || apiError);
                console.log(`[Proxy] Falling back to CSV export method for ${sheetName}...`);
            }
        }
        // Fallback to legacy CSV export method
        url = normalizeSheetUrl(url);
        try {
            console.log(`[Proxy] Fetching via CSV export: ${url.substring(0, 50)}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), GOOGLE_FETCH_TIMEOUT_MS);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error("Google Sheets respondió 400. Verifique publicación CSV o credenciales GOOGLE_* en Render.");
                }
                throw new Error(`Google Sheets respondió con error ${response.status}`);
            }
            const data = await response.text();
            storeCacheEntry(cacheKey, data, "csv_export");
            return sendCsvResponse(res, data, "MISS", "csv_export");
        }
        catch (error) {
            console.error(`[Proxy] Error fetching sheet ${sheetName}:`, error.message || error);
            const staleCacheEntry = sheetCache.get(cacheKey);
            if (staleCacheEntry) {
                console.warn(`[Cache] Serving stale data for ${sheetName} after upstream failure.`);
                return sendCsvResponse(res, staleCacheEntry.csv, "STALE", staleCacheEntry.source);
            }
            res.status(500).json({
                error: "Error al obtener datos de la fuente.",
                details: error.name === 'AbortError' ? "La peticiÃ³n excediÃ³ el tiempo lÃ­mite (15s)" : (error instanceof Error ? error.message : String(error))
            });
        }
    });
    app.get("/api/health", (req, res) => {
        console.log(`[Health] Check received at ${new Date().toISOString()}`);
        res.json({
            status: "ok",
            environment: process.env.NODE_ENV || "development",
            time: new Date().toISOString(),
            passwordProtected
        });
    });
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        if (fs.existsSync(distPath)) {
            console.log(`[Server] Serving static files from: ${distPath}`);
            app.use(express.static(distPath));
            app.get("*all", (req, res) => {
                res.sendFile(path.join(distPath, "index.html"));
            });
        }
        else {
            console.log(`[Server] dist folder not found. API-only mode enabled.`);
        }
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Configured sheets: ${Object.keys(sheetUrls).filter(k => !!sheetUrls[k]).join(', ') || 'None'}`);
    });
}
startServer().catch(err => {
    console.error("Failed to start server:", err);
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { google } from "googleapis";
import { buildSeguimientoSummary, parseReclamosRows, RECLAMOS_SHEET_TITLE, SEGUIMIENTO_RECLAMOS_KEY } from "./services/seguimientoReclamos.js";

type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOOGLE_FETCH_TIMEOUT_MS = 30000;
const SHEET_CACHE_TTL_MS = 5 * 60 * 1000;
const SHEET_METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DATA_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DATA_MAX_REQUESTS_PER_MINUTE = Math.min(
  Math.max(Number(process.env.DATA_MAX_REQUESTS_PER_MINUTE) || 180, 30),
  600
);
const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type CachedSheetMetadata = {
  title: string;
  cachedAt: number;
};

type CachedSheetEntry = {
  csv: string;
  contentType: string;
  cachedAt: number;
  source: "google_api";
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2kb" }));
  const sheetCache = new Map<string, CachedSheetEntry>();
  const sheetMetadataCache = new Map<string, CachedSheetMetadata>();
  const dataRequestAttempts = new Map<string, RateLimitEntry>();
  let seguimientoReclamosCache: { source: string; rows: unknown[][]; cachedAt: number } | null = null;
  app.set("trust proxy", 1);
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
    origin: (origin: string | undefined, callback: CorsOriginCallback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Requested-With", "Accept", "Authorization"],
    credentials: false,
  }));
  app.use((req, res, next) => {
    res.setHeader("Vary", "Origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
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

  const resolvedDetailedQualitySaltaUrl =
    process.env.LINK_REFUERZO_SLA ||
    process.env.SHEET_URL_DETAILED_QUALITY_SALTA;

  const sheetUrls: Record<string, string | undefined> = {
    // Quality & Sales Quality
    sales_quality: process.env.LINK_ENCUESTAS_V || process.env.SHEET_URL_SALES_QUALITY,
    sales_claims: process.env.LINK_RECLAMOS_V || process.env.SHEET_URL_SALES_CLAIMS,
    ssi_surveys: process.env.LINK_ENCUESTAS_SSI || process.env.SHEET_URL_SSI_SURVEYS,
    csi_surveys: process.env.LINK_ENCUESTAS_CSI || process.env.SHEET_URL_CSI_SURVEYS,
    cem_os: process.env.LINK_OS_JUJUY || process.env.SHEET_URL_CEM_OS,
    cem_os_salta: process.env.LINK_OS_SALTA || process.env.SHEET_URL_CEM_OS_SALTA,
    scoring: process.env.LINK_SCORING || process.env.SHEET_URL_SCORING,
    
    // Detailed Quality (Refuerzo)
    detailed_quality: process.env.LINK_REFUERZO_JJY || process.env.SHEET_URL_DETAILED_QUALITY,
    detailed_quality_salta: resolvedDetailedQualitySaltaUrl,
    
    // Postventa
    postventa: process.env.LINK_AVANCE_PPT || process.env.SHEET_URL_POSTVENTA,
    quality: process.env.LINK_RECLAMOS_PV || process.env.SHEET_URL_QUALITY,
    postventa_kpi: process.env.LINK_KPI_PV || process.env.SHEET_URL_POSTVENTA_KPI,
    postventa_kpis: process.env.LINK_KPI_PV || process.env.SHEET_URL_POSTVENTA_KPI,
    postventa_billing: process.env.LINK_FACTURACION || process.env.SHEET_URL_POSTVENTA_BILLING,
    pvt_occupation: process.env.LINK_OCUPACION_PVT || process.env.SHEET_URL_PVT_OCCUPATION,
    internal_postventa: process.env.LINK_INTERNAL_POSTVENTA || process.env.SHEET_URL_INTERNAL_POSTVENTA,
    
    // Action Plan
    action_plan: process.env.LINK_PLAN_ACCION || process.env.SHEET_URL_ACTION_PLAN,
    action_plan_sales: process.env.LINK_PLAN_ACCION || process.env.SHEET_URL_ACTION_PLAN_SALES,
    warranty_q1: process.env.LINK_GARANTIA_Q1 || process.env.LINK_GARANTIA || process.env.SHEET_URL_WARRANTY_Q1,
    warranty_q2: process.env.LINK_GARANTIA_Q2 || process.env.SHEET_URL_WARRANTY_Q2,
    warranty_q3: process.env.LINK_GARANTIA_Q3 || process.env.SHEET_URL_WARRANTY_Q3,
    warranty_q4: process.env.LINK_GARANTIA_Q4 || process.env.SHEET_URL_WARRANTY_Q4,
    
    // Others
    pcgc: process.env.LINK_PCGC || process.env.SHEET_URL_PCGC,
    quality_objectives: process.env.LINK_OBJETIVOS_CALIDAD || process.env.SHEET_URL_QUALITY_OBJECTIVES,
    quality_objectives_summary: process.env.LINK_OBJETIVOS_CALIDAD_RESUMEN || process.env.SHEET_URL_QUALITY_OBJECTIVES_SUMMARY,
    quality_objectives_scales: process.env.LINK_OBJETIVOS_CALIDAD_ESCALAS || process.env.SHEET_URL_QUALITY_OBJECTIVES_SCALES,
    hr_grades: process.env.LINK_RRHH_NOTAS || process.env.SHEET_URL_HR_GRADES,
    hr_relatorio: process.env.LINK_RRHH_RELAT || process.env.SHEET_URL_HR_RELATORIO,
    hr_contacts: process.env.LINK_RRHH_CONTACTOS || process.env.SHEET_URL_HR_CONTACTS,
    hr_phases: process.env.LINK_RRHH_FASES || process.env.SHEET_URL_HR_PHASES,
    rrhh: process.env.SHEET_URL_RRHH || process.env.RRHH_URL,
    ventas: process.env.SHEET_URL_VENTAS || process.env.VENTAS_URL,
    ambiente: process.env.LINK_CONSUMOS_AMBIENTE || process.env.SHEET_URL_AMBIENTE_CONSUMOS,
  };
  const allowedSheetNames = new Set(Object.keys(sheetUrls));
  const seguimientoReclamosSource = process.env.LINK_SEGUIMIENTO_RECLAMOS_PV;
  const hasGoogleCredentials = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
  const dashboardPassword = process.env.GLOBAL_PASSWORD || "";
  const passwordProtectionEnabled = process.env.IS_PASSWORD_PROTECTED === "true" && Boolean(dashboardPassword);
  const authSigningSecret = dashboardPassword;
  const loginAttempts = new Map<string, RateLimitEntry>();
  const signSession = (expiresAt: number) => {
    const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
    const signature = createHmac("sha256", authSigningSecret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  };
  const isValidSession = (token: string | undefined) => {
    if (!passwordProtectionEnabled || !token) return !passwordProtectionEnabled;
    const [payload, suppliedSignature, extra] = token.split(".");
    if (!payload || !suppliedSignature || extra) return false;
    const expectedSignature = createHmac("sha256", authSigningSecret).update(payload).digest();
    let actualSignature: Buffer;
    try { actualSignature = Buffer.from(suppliedSignature, "base64url"); } catch { return false; }
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return false;
    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return Number.isSafeInteger(parsed.exp) && parsed.exp > Date.now();
    } catch { return false; }
  };
  const getBearerToken = (req: express.Request) => {
    const value = req.header("authorization") || "";
    return value.startsWith("Bearer ") ? value.slice(7) : undefined;
  };
  const requireDashboardAuth: express.RequestHandler = (req, res, next) => {
    if (!passwordProtectionEnabled || isValidSession(getBearerToken(req))) return next();
    return res.status(401).json({ error: "La sesión venció. Ingrese nuevamente al tablero.", code: "AUTH_REQUIRED" });
  };

  app.post("/api/auth/login", (req, res) => {
    if (!passwordProtectionEnabled) return res.json({ enabled: false });
    const now = Date.now();
    const clientKey = getClientKey(req);
    const existing = loginAttempts.get(clientKey);
    if (existing && existing.resetAt > now && existing.count >= 10) {
      res.setHeader("Retry-After", String(Math.ceil((existing.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Demasiados intentos. Espere unos minutos y vuelva a intentar." });
    }
    const attempt = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS };
    attempt.count += 1;
    loginAttempts.set(clientKey, attempt);
    const submittedPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const expectedHash = createHash("sha256").update(dashboardPassword).digest();
    const submittedHash = createHash("sha256").update(submittedPassword).digest();
    if (!timingSafeEqual(expectedHash, submittedHash)) {
      return res.status(401).json({ error: "La contraseña no es correcta." });
    }
    loginAttempts.delete(clientKey);
    const expiresAt = now + AUTH_SESSION_TTL_MS;
    return res.json({ token: signSession(expiresAt), expiresAt });
  });

  app.get("/api/auth/verify", (req, res) => {
    if (!passwordProtectionEnabled) return res.json({ enabled: false, valid: true });
    const valid = isValidSession(getBearerToken(req));
    return res.status(valid ? 200 : 401).json({ enabled: true, valid });
  });

  const getClientKey = (req: express.Request) => String(req.ip || "unknown").slice(0, 200);

  const getActiveRateLimitEntry = (clientKey: string, now: number) => {
    const entry = dataRequestAttempts.get(clientKey);
    if (!entry || entry.resetAt <= now) {
      dataRequestAttempts.delete(clientKey);
      return undefined;
    }
    return entry;
  };

  const setRateLimitHeaders = (res: express.Response, entry: RateLimitEntry, now: number) => {
    res.setHeader("RateLimit-Limit", String(DATA_MAX_REQUESTS_PER_MINUTE));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, DATA_MAX_REQUESTS_PER_MINUTE - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
  };

  const limitDataRequests = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const clientKey = getClientKey(req);
    const existing = getActiveRateLimitEntry(clientKey, now);

    if (existing && existing.count >= DATA_MAX_REQUESTS_PER_MINUTE) {
      setRateLimitHeaders(res, { ...existing, count: DATA_MAX_REQUESTS_PER_MINUTE }, now);
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((existing.resetAt - now) / 1000))));
      return res.status(429).json({ error: "Demasiadas consultas de datos. Espere un minuto antes de reintentar." });
    }

    const entry: RateLimitEntry = existing || {
      count: 0,
      resetAt: now + DATA_RATE_LIMIT_WINDOW_MS,
    };
    entry.count += 1;
    dataRequestAttempts.set(clientKey, entry);
    setRateLimitHeaders(res, entry, now);
    return next();
  };

  console.log("[Debug] Current Working Directory:", process.cwd());

  // Helper to extract Spreadsheet ID and GID from URL
  const extractSheetInfo = (url: string) => {
    if (!url) return null;
    
    // If it's just an ID (no slashes), assume it's the Spreadsheet ID
    if (!url.includes('/')) {
      return { spreadsheetId: url, gid: '0' };
    }

    // Published Sheets use `/d/e/<publication-id>/pub`; those public links are rejected.
    const idMatch = url.match(/\/d\/(?!e\/)([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/gid=([0-9]+)/);
    
    return {
      spreadsheetId: idMatch ? idMatch[1] : null,
      gid: gidMatch ? gidMatch[1] : '0'
    };
  };

  const isSpreadsheetId = (value: string) => /^[a-zA-Z0-9-_]{20,}$/.test(value);

  const isAllowedSheetUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.hostname === "docs.google.com" &&
        parsed.pathname.includes("/spreadsheets/") &&
        !parsed.pathname.includes("/spreadsheets/d/e/");
    } catch {
      return false;
    }
  };

  // Helper to convert 2D array from Google Sheets API to CSV string
  const arrayToCsv = (rows: any[][]) => {
    return rows.map(row => 
      row.map(cell => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');
  };

  const withGoogleTimeout = async <T>(operation: Promise<T>): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error(`Timeout al conectar con Google Sheets API (${Math.round(GOOGLE_FETCH_TIMEOUT_MS / 1000)}s)`)),
            GOOGLE_FETCH_TIMEOUT_MS
          );
        })
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const getSheetTitle = async (spreadsheetId: string, gid: string) => {
    const metadataKey = `${spreadsheetId}::${gid}`;
    const cachedMetadata = sheetMetadataCache.get(metadataKey);
    if (cachedMetadata && Date.now() - cachedMetadata.cachedAt < SHEET_METADATA_CACHE_TTL_MS) {
      return cachedMetadata.title;
    }

    const spreadsheet: any = await withGoogleTimeout(
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(sheetId,index,title))",
      })
    );
    const sheet = spreadsheet.data.sheets?.find((item: any) =>
      String(item.properties?.sheetId) === gid ||
      (gid === "0" && item.properties?.index === 0)
    );
    const title = sheet?.properties?.title || "Sheet1";

    sheetMetadataCache.set(metadataKey, { title, cachedAt: Date.now() });
    return title;
  };

  const getCacheKey = (sheetName: string, resolvedUrl: string) => `${sheetName}::${resolvedUrl}`;

  const getFreshCacheEntry = (cacheKey: string) => {
    const entry = sheetCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > SHEET_CACHE_TTL_MS) return null;
    return entry;
  };

  const storeCacheEntry = (cacheKey: string, csv: string, source: CachedSheetEntry["source"]) => {
    sheetCache.set(cacheKey, {
      csv,
      cachedAt: Date.now(),
      contentType: "text/csv; charset=utf-8",
      source
    });
  };

  const sendCsvResponse = (
    res: express.Response,
    csv: string,
    cacheStatus: "MISS" | "HIT" | "STALE",
    source: string
  ) => {
    res.setHeader("X-Cache-Status", cacheStatus);
    res.setHeader("X-Data-Source", source);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.header("Content-Type", "text/csv; charset=utf-8");
    return res.send(csv);
  };

  // Internal source key: intentionally aggregate-only. It is not included in
  // sheetUrls/allowedSheetNames, so the generic CSV endpoint cannot expose rows.
  app.get(`/api/data/${SEGUIMIENTO_RECLAMOS_KEY}`, requireDashboardAuth, limitDataRequests, async (req, res) => {
    if (!seguimientoReclamosSource) {
      return res.status(503).json({ error: "Falta configurar LINK_SEGUIMIENTO_RECLAMOS_PV en el backend." });
    }
    if (!hasGoogleCredentials) {
      return res.status(503).json({ error: "La conexión segura a Google Sheets no está configurada." });
    }
    if (!isSpreadsheetId(seguimientoReclamosSource) && !isAllowedSheetUrl(seguimientoReclamosSource)) {
      return res.status(400).json({ error: "El enlace configurado para Seguimiento de Reclamos no es válido." });
    }

    const sourceInfo = extractSheetInfo(seguimientoReclamosSource);
    if (!sourceInfo?.spreadsheetId) {
      return res.status(400).json({ error: "No se pudo identificar el archivo configurado para Seguimiento de Reclamos." });
    }

    try {
      const forceRefresh = req.query.refresh === "1";
      const freshCache = seguimientoReclamosCache &&
        seguimientoReclamosCache.source === seguimientoReclamosSource &&
        Date.now() - seguimientoReclamosCache.cachedAt < SHEET_CACHE_TTL_MS;
      let values: unknown[][];
      if (freshCache && !forceRefresh) {
        values = seguimientoReclamosCache!.rows;
      } else {
        const spreadsheet: any = await withGoogleTimeout(sheets.spreadsheets.get({
          spreadsheetId: sourceInfo.spreadsheetId,
          fields: "sheets(properties(sheetId,index,title))",
        }));
        const targetSheet = spreadsheet.data.sheets?.find((item: any) =>
          item.properties?.title === RECLAMOS_SHEET_TITLE
        );
        if (!targetSheet) {
          return res.status(404).json({ error: `No existe la pestaña "${RECLAMOS_SHEET_TITLE}" en la planilla configurada.` });
        }

        const result: any = await withGoogleTimeout(sheets.spreadsheets.values.get({
          spreadsheetId: sourceInfo.spreadsheetId,
          range: `'${RECLAMOS_SHEET_TITLE}'!A:AG`,
        }));
        values = result.data.values || [];
        if (!values.length) return res.status(502).json({ error: "La pestaña Reclamos está vacía o no se pudo leer." });
        seguimientoReclamosCache = { source: seguimientoReclamosSource, rows: values, cachedAt: Date.now() };
      }

      const parsed = parseReclamosRows(values);
      const parseNumberParam = (value: unknown) => {
        if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) return undefined;
        return Number(value);
      };
      const summary = buildSeguimientoSummary(parsed, {
        year: parseNumberParam(req.query.year),
        month: parseNumberParam(req.query.month),
        branch: typeof req.query.branch === "string" ? req.query.branch : undefined,
        advisor: typeof req.query.advisor === "string" ? req.query.advisor : undefined,
        managementState: typeof req.query.managementState === "string" ? req.query.managementState as any : undefined,
        type: typeof req.query.type === "string" ? req.query.type as any : undefined,
      });
      res.setHeader("X-Data-Source", "google_api_aggregate");
      res.setHeader("X-Cache-Status", freshCache && !forceRefresh ? "HIT" : "MISS");
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.json(summary);
    } catch (error: any) {
      console.error("[Seguimiento Reclamos] Error leyendo indicadores agregados:", error?.message || error);
      return res.status(502).json({ error: "No se pudo leer la pestaña Reclamos. Verifique que la cuenta de servicio tenga permiso de lectura y que los encabezados estén completos." });
    }
  });

  app.get("/api/data/:sheetName", requireDashboardAuth, limitDataRequests, async (req, res) => {
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
      console.error(`[Proxy] Invalid private Sheet configuration for ${sheetName}.`);
      return res.status(400).json({
        error: `La fuente privada configurada para "${sheetName}" no es valida.`,
        details: "Use un ID de Google Sheets o un enlace privado que empiece con /spreadsheets/d/."
      });
    }

    const cacheKey = getCacheKey(sheetName, url);
    const freshCacheEntry = getFreshCacheEntry(cacheKey);
    if (freshCacheEntry) {
      console.log(`[Cache] HIT for ${sheetName}`);
      return sendCsvResponse(res, freshCacheEntry.csv, "HIT", freshCacheEntry.source);
    }

    if (!hasGoogleCredentials) {
      console.error("[Security] Google service-account credentials are not configured.");
      return res.status(503).json({ error: "La conexion segura a los datos no esta configurada." });
    }

    const info = extractSheetInfo(url);
    if (!info?.spreadsheetId) {
      return res.status(400).json({
        error: `La fuente privada configurada para "${sheetName}" no es valida.`
      });
    }

    try {
      console.log(`[API] Fetching private data for ${sheetName}.`);
      const sheetNameInSpreadsheet = await getSheetTitle(info.spreadsheetId, info.gid);
      const result: any = await withGoogleTimeout(
        sheets.spreadsheets.values.get({
          spreadsheetId: info.spreadsheetId,
          // Read every populated row; a fixed row cap silently drops recent records.
          range: `'${sheetNameInSpreadsheet.replace(/'/g, "''")}'!A:ZZ`,
        })
      );
      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        throw new Error("No se encontraron datos en la hoja especificada.");
      }

      const csvData = arrayToCsv(rows);
      storeCacheEntry(cacheKey, csvData, "google_api");
      return sendCsvResponse(res, csvData, "MISS", "google_api");
    } catch (apiError: any) {
      console.error(`[API] Error reading private data for ${sheetName}:`, apiError.message || apiError);
      const staleCacheEntry = sheetCache.get(cacheKey);
      if (staleCacheEntry) {
        console.warn(`[Cache] Serving stale data for ${sheetName} after Google API failure.`);
        return sendCsvResponse(res, staleCacheEntry.csv, "STALE", staleCacheEntry.source);
      }
      return res.status(502).json({
        error: "No se pudo obtener la fuente privada.",
        details: "Verifique que la cuenta de servicio tenga acceso de lector a la planilla."
      });
    }
  });



  app.get("/api/health", (req, res) => {
    console.log(`[Health] Check received at ${new Date().toISOString()}`);
    res.json({ 
      status: "ok", 
      environment: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
      passwordProtected: passwordProtectionEnabled
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
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      console.log(`[Server] Serving static files from: ${distPath}`);
      app.use(express.static(distPath));
      app.get("*all", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
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


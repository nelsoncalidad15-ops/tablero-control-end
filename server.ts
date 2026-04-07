import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
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
    allowedHeaders: ["Content-Type", "X-Requested-With", "Accept"],
    credentials: false,
  }));
  app.use((req, res, next) => {
    res.setHeader("Vary", "Origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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

  const sheetUrls: Record<string, string | undefined> = {
    // Quality & Sales Quality
    sales_quality: process.env.LINK_ENCUESTAS_V || process.env.SHEET_URL_SALES_QUALITY,
    sales_claims: process.env.LINK_RECLAMOS_V || process.env.SHEET_URL_SALES_CLAIMS,
    cem_os: process.env.LINK_OS_JUJUY || process.env.SHEET_URL_CEM_OS,
    cem_os_salta: process.env.LINK_OS_SALTA || process.env.SHEET_URL_CEM_OS_SALTA,
    
    // Detailed Quality (Refuerzo)
    detailed_quality: process.env.LINK_REFUERZO_JJY || process.env.SHEET_URL_DETAILED_QUALITY,
    detailed_quality_salta: process.env.LINK_REFUERZO_SLA || process.env.SHEET_URL_DETAILED_QUALITY_SALTA,
    
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
    rrhh: process.env.SHEET_URL_RRHH || process.env.RRHH_URL,
    ventas: process.env.SHEET_URL_VENTAS || process.env.VENTAS_URL,
  };

  console.log("[Debug] Current Working Directory:", process.cwd());
  console.log("[Debug] LINK_AVANCE_PPT:", process.env.LINK_AVANCE_PPT ? "Found" : "Not Found");
  console.log("[Debug] GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "Found" : "Not Found");

  // Helper to extract Spreadsheet ID and GID from URL
  const extractSheetInfo = (url: string) => {
    if (!url) return null;
    
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

  const isSpreadsheetId = (value: string) => /^[a-zA-Z0-9-_]{20,}$/.test(value);

  const isAllowedSheetUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.hostname === "docs.google.com" && parsed.pathname.includes("/spreadsheets/");
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

  // Helper to normalize Google Sheets URLs to CSV export links (Legacy method)
  const normalizeSheetUrl = (url: string): string => {
    if (!url) return url;
    if (url.includes('output=csv') || url.includes('/export') || url.includes('format=csv')) return url;

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
  app.get("/api/data/:sheetName", async (req, res) => {
    const { sheetName } = req.params;
    const queryUrl = req.query.url as string;
    let url = queryUrl || sheetUrls[sheetName];

    console.log(`[Proxy] Request for sheet: ${sheetName}`);

    if (!url) {
      return res.status(400).json({ error: `Falta configurar el link de Google Sheets para "${sheetName}".` });
    }

    // Basic validation to prevent fetching invalid URLs like "Duquesa123"
    if (!isSpreadsheetId(url) && !isAllowedSheetUrl(url)) {
      console.error(`[Proxy] Invalid URL for ${sheetName}: ${url}`);
      return res.status(400).json({ 
        error: `El link configurado para "${sheetName}" no es válido.`,
        details: `Se recibió "${url}" pero se esperaba un link de Google Sheets.`
      });
    }

    // Try Google Sheets API first if credentials are provided
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      try {
        const info = extractSheetInfo(url);
        if (info?.spreadsheetId) {
          console.log(`[API] Fetching via Google Sheets API: ${info.spreadsheetId}`);
          
          // Set a timeout for the Google API call
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout al conectar con Google Sheets API")), 15000)
          );

          // Get spreadsheet metadata to find the sheet name for the GID
          const spreadsheetPromise = sheets.spreadsheets.get({
            spreadsheetId: info.spreadsheetId
          });

          const spreadsheet: any = await Promise.race([spreadsheetPromise, timeoutPromise]);

          const sheet = spreadsheet.data.sheets?.find((s: any) => 
            String(s.properties?.sheetId) === info.gid || 
            (info.gid === '0' && s.properties?.index === 0)
          );

          const sheetNameInSpreadsheet = sheet?.properties?.title || 'Sheet1';
          
          const resultPromise = sheets.spreadsheets.values.get({
            spreadsheetId: info.spreadsheetId,
            range: `${sheetNameInSpreadsheet}!A1:ZZ5000`, // Increased range to ZZ
          });

          const result: any = await Promise.race([resultPromise, timeoutPromise]);

          const rows = result.data.values;
          if (!rows || rows.length === 0) {
            throw new Error("No se encontraron datos en la hoja especificada.");
          }

          const csvData = arrayToCsv(rows);
          res.header("Content-Type", "text/csv; charset=utf-8");
          return res.send(csvData);
        }
      } catch (apiError: any) {
        console.error(`[API] Error using Google Sheets API for ${sheetName}:`, apiError.message || apiError);
        console.log(`[Proxy] Falling back to CSV export method for ${sheetName}...`);
      }
    }

    // Fallback to legacy CSV export method
    url = normalizeSheetUrl(url);
    try {
      console.log(`[Proxy] Fetching via CSV export: ${url.substring(0, 50)}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Sheets respondió con error ${response.status}`);
      }
      const data = await response.text();
      res.header("Content-Type", "text/csv; charset=utf-8");
      res.send(data);
    } catch (error: any) {
      console.error(`[Proxy] Error fetching sheet ${sheetName}:`, error.message || error);
      res.status(500).json({ 
        error: "Error al obtener datos de la fuente.",
        details: error.name === 'AbortError' ? "La petición excedió el tiempo límite (15s)" : (error instanceof Error ? error.message : String(error))
      });
    }
  });

  app.get("/api/health", (req, res) => {
    console.log(`[Health] Check received at ${new Date().toISOString()}`);
    res.json({ 
      status: "ok", 
      environment: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
      nodeVersion: process.version
    });
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/secrets", (req, res) => {
      const relevantKeys = Object.keys(process.env).filter(key =>
        key.startsWith("LINK_") ||
        key.startsWith("SHEET_") ||
        key.startsWith("GOOGLE_") ||
        key === "VITE_API_URL"
      );

      const secretsStatus: Record<string, boolean | number | string[] | undefined> = {
        _found_keys: relevantKeys,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_PRIVATE_KEY_LENGTH: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        VITE_API_URL: !!process.env.VITE_API_URL,
      };

      relevantKeys.forEach(key => {
        secretsStatus[key] = !!process.env[key];
      });

      res.json(secretsStatus);
    });
  }

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

import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Google Sheets API Setup
  const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: SCOPES
  });

  const sheets = google.sheets({ version: "v4", auth });

  const sheetUrls: Record<string, string | undefined> = {
    // Quality & Sales Quality
    sales_quality: process.env.LINK_ENCUESTAS_V,
    sales_claims: process.env.LINK_RECLAMOS_V,
    cem_os: process.env.LINK_OS_JUJUY,
    cem_os_salta: process.env.LINK_OS_SALTA,
    
    // Detailed Quality (Refuerzo)
    detailed_quality: process.env.LINK_REFUERZO_JJY,
    detailed_quality_salta: process.env.LINK_REFUERZO_SLA,
    
    // Postventa
    postventa: process.env.LINK_AVANCE_PPT,
    quality: process.env.LINK_RECLAMOS_PV,
    postventa_kpi: process.env.LINK_KPI_PV,
    postventa_kpis: process.env.LINK_KPI_PV,
    postventa_billing: process.env.LINK_FACTURACION,
    internal_postventa: process.env.SHEET_URL_INTERNAL_POSTVENTA,
    
    // Action Plan
    action_plan: process.env.LINK_PLAN_ACCION,
    action_plan_sales: process.env.LINK_PLAN_ACCION,
    
    // Others
    pcgc: process.env.SHEET_URL_PCGC,
    hr_grades: process.env.LINK_RRHH_NOTAS,
    hr_relatorio: process.env.LINK_RRHH_RELAT,
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

    // Try Google Sheets API first if credentials are provided
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      try {
        const info = extractSheetInfo(url);
        if (info?.spreadsheetId) {
          console.log(`[API] Fetching via Google Sheets API: ${info.spreadsheetId}`);
          
          // Get spreadsheet metadata to find the sheet name for the GID
          const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: info.spreadsheetId
          });

          const sheet = spreadsheet.data.sheets?.find(s => 
            String(s.properties?.sheetId) === info.gid || 
            (info.gid === '0' && s.properties?.index === 0)
          );

          const sheetNameInSpreadsheet = sheet?.properties?.title || 'Sheet1';
          
          const result = await sheets.spreadsheets.values.get({
            spreadsheetId: info.spreadsheetId,
            range: `${sheetNameInSpreadsheet}!A1:Z5000`, // Adjust range as needed
          });

          const rows = result.data.values;
          if (!rows || rows.length === 0) {
            throw new Error("No se encontraron datos en la hoja especificada.");
          }

          const csvData = arrayToCsv(rows);
          res.header("Content-Type", "text/csv; charset=utf-8");
          return res.send(csvData);
        }
      } catch (apiError) {
        console.error(`[API] Error using Google Sheets API for ${sheetName}:`, apiError);
        console.log(`[Proxy] Falling back to CSV export method for ${sheetName}...`);
      }
    }

    // Fallback to legacy CSV export method
    url = normalizeSheetUrl(url);
    try {
      console.log(`[Proxy] Fetching via CSV export: ${url.substring(0, 50)}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets respondió con error ${response.status}`);
      }
      const data = await response.text();
      res.header("Content-Type", "text/csv; charset=utf-8");
      res.send(data);
    } catch (error) {
      console.error(`[Proxy] Error fetching sheet ${sheetName}:`, error);
      res.status(500).json({ 
        error: "Error al obtener datos de la fuente.",
        details: error instanceof Error ? error.message : String(error)
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
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

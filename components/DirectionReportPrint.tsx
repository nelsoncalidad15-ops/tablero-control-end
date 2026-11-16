import React from 'react';
import {
  ComputedDirectionReportData,
  DirectionReportDocument,
} from '../types/directionReport';
import { DirectionPageTemplateRenderer } from './DirectionReportTemplates';

interface DirectionReportPrintProps {
  doc: DirectionReportDocument;
  computed: ComputedDirectionReportData;
}

export const DirectionReportPrint: React.FC<DirectionReportPrintProps> = ({
  doc,
  computed,
}) => {
  const exportablePages = doc.pages.filter(p => p.visible && p.exportSelected !== false);

  return (
    <div className="direction-print-root hidden print:block bg-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print-direction {
                display: none !important;
              }
              .direction-print-root {
                display: block !important;
                width: 297mm !important;
              }
              .direction-print-page-wrapper {
                width: 297mm !important;
                height: 210mm !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .direction-print-page-wrapper:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `,
        }}
      />

      {exportablePages.map((page, index) => (
        <div key={page.id} className="direction-print-page-wrapper">
          <DirectionPageTemplateRenderer
            page={page}
            pageNumber={index + 1}
            totalPages={exportablePages.length}
            doc={doc}
            computed={computed}
            isPrintMode={true}
            onUpdatePage={() => {}}
          />
        </div>
      ))}
    </div>
  );
};

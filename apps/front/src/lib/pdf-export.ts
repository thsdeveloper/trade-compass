import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { REPORT_TYPE_LABELS, type ReportType } from '@/types/reports';

export interface PDFExportOptions {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  element: HTMLElement;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(): string {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR');
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export async function exportReportToPDF(options: PDFExportOptions): Promise<void> {
  const { reportType, startDate, endDate, element } = options;

  // Store original styles to restore later
  const originalStyles: { el: HTMLElement; overflow: string; maxHeight: string }[] = [];

  // Remove overflow and max-height from scrollable containers for capture
  const scrollableElements = element.querySelectorAll('[class*="overflow"], [class*="max-h-"]');
  scrollableElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    originalStyles.push({
      el: htmlEl,
      overflow: htmlEl.style.overflow,
      maxHeight: htmlEl.style.maxHeight,
    });
    htmlEl.style.overflow = 'visible';
    htmlEl.style.maxHeight = 'none';
  });

  try {
    // Capture element with html-to-image
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    // Load image to get dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Create PDF (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const headerHeight = 25;
    const footerHeight = 15;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - headerHeight - footerHeight - margin;

    // Calculate image dimensions to fit content area
    const imgWidth = contentWidth;
    const imgHeight = (img.height * imgWidth) / img.width;

    // Calculate how many pages we need
    const totalPages = Math.ceil(imgHeight / contentHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Draw header
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');

      // Report title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(REPORT_TYPE_LABELS[reportType], margin, 12);

      // Period subtitle
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(
        `Periodo: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
        margin,
        19
      );

      // Add clipped image for this page
      const sourceY = page * contentHeight;
      const sourceHeight = Math.min(contentHeight, imgHeight - sourceY);

      if (sourceHeight > 0) {
        // Calculate source coordinates in image pixels
        const imgSourceY = (sourceY / imgHeight) * img.height;
        const imgSourceHeight = (sourceHeight / imgHeight) * img.height;

        // Create a temporary canvas for the page slice
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = imgSourceHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(
            img,
            0,
            imgSourceY,
            img.width,
            imgSourceHeight,
            0,
            0,
            img.width,
            imgSourceHeight
          );

          const pageImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(
            pageImgData,
            'PNG',
            margin,
            headerHeight,
            imgWidth,
            sourceHeight
          );
        }
      }

      // Draw footer
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

      // Footer text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500

      // Generation date (left)
      pdf.text(`Gerado em ${formatDateTime()}`, margin, pageHeight - 6);

      // Page number (right)
      const pageText = `Pagina ${page + 1} de ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 6);
    }

    // Generate filename
    const reportName = REPORT_TYPE_LABELS[reportType]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    const filename = `relatorio-${reportName}-${startDate}-a-${endDate}.pdf`;

    // Save PDF
    pdf.save(filename);
  } finally {
    // Restore original styles
    originalStyles.forEach(({ el, overflow, maxHeight }) => {
      el.style.overflow = overflow;
      el.style.maxHeight = maxHeight;
    });
  }
}

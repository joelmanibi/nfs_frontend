import jsPDF from 'jspdf';

// Kit partagé pour la mise en page des rapports PDF (jsPDF) — en-tête avec
// logos, cartes KPI, tableaux, pied de page. Utilisé par exportReport.js et
// exportUserReport.js pour un rendu visuel cohérent entre les deux rapports.

export const MARGIN = 40;

export const PDF_COLORS = {
  ink:        [15, 23, 42],    // slate-900 — titres
  secondary:  [51, 65, 85],    // slate-700 — texte courant
  muted:      [100, 116, 139], // slate-500 — libellés / notes
  hairline:   [226, 232, 240], // slate-200 — traits fins
  surface:    [248, 250, 252], // slate-50  — fond des cartes
  surfaceAlt: [241, 245, 249], // slate-100 — zébrures de tableau
  blue:       [57, 135, 229],  // slot catégoriel 1
  aqua:       [25, 158, 112],  // slot catégoriel 2
  amber:      [217, 119, 6],   // accent volume
  violet:     [124, 58, 237],  // accent taux
};

async function loadImageDataUrl(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Logo introuvable : ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Crée un document jsPDF A4 et dessine l'en-tête : logo PAA à gauche, logo
 * IDS Secure Transport à droite, titre centré entre les deux, puis un trait
 * fin séparant l'en-tête du contenu.
 *
 * @returns {Promise<{ doc, margin, pageWidth, pageHeight, y }>} y = position
 * verticale juste sous l'en-tête, prête pour le contenu.
 */
export async function createReportDocument({ title, subtitle }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = MARGIN;
  const logoSize = 42;
  let y = margin;

  const [paaLogo, idsLogo] = await Promise.allSettled([
    loadImageDataUrl('/logo11.png'),
    loadImageDataUrl('/logo_ids.png'),
  ]);

  if (paaLogo.status === 'fulfilled') {
    const props = doc.getImageProperties(paaLogo.value);
    const w = logoSize;
    const h = (props.height / props.width) * w;
    doc.addImage(paaLogo.value, 'PNG', margin, y, w, h);
  }

  if (idsLogo.status === 'fulfilled') {
    const props = doc.getImageProperties(idsLogo.value);
    const h = logoSize;
    const w = (props.width / props.height) * h;
    doc.addImage(idsLogo.value, 'PNG', pageWidth - margin - w, y, w, h);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(title, pageWidth / 2, y + logoSize / 2 - 3, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(subtitle, pageWidth / 2, y + logoSize / 2 + 13, { align: 'center' });
  }

  y += logoSize + 16;
  doc.setDrawColor(...PDF_COLORS.hairline);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  return { doc, margin, pageWidth, pageHeight, y };
}

/** Titre de section : petit repère coloré + libellé en gras. */
export function sectionTitle(doc, { x, y, text, color = PDF_COLORS.blue }) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y - 9, 3, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(text, x + 9, y);
  return y + 20;
}

/** Ligne de méta-information discrète (date, période...). */
export function metaLine(doc, { x, y, text }) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(text, x, y);
  return y + 13;
}

/**
 * Rangée de cartes KPI (valeur en gros + libellé), largeur répartie
 * également sur la largeur disponible. items: [{ label, value, accent }]
 */
export function statCards(doc, { x, y, width, items, height = 56 }) {
  const gap = 10;
  const cardWidth = (width - gap * (items.length - 1)) / items.length;

  items.forEach((item, i) => {
    const cx = x + i * (cardWidth + gap);

    doc.setFillColor(...PDF_COLORS.surface);
    doc.roundedRect(cx, y, cardWidth, height, 6, 6, 'F');

    doc.setFillColor(...(item.accent || PDF_COLORS.blue));
    doc.roundedRect(cx, y, 3, height, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(String(item.value), cx + 13, y + 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(item.label.toUpperCase(), cx + 13, y + 41, { maxWidth: cardWidth - 22 });
  });

  return y + height + 24;
}

/**
 * Tableau simple avec en-tête discret et zébrures.
 * columns: [{ label, width, align }], rows: string[][]
 */
export function simpleTable(doc, { x, y, width, columns, rows }) {
  let cursorX = x;
  const colX = columns.map((col) => {
    const cx = cursorX;
    cursorX += col.width;
    return cx;
  });
  const textX = (i) => (columns[i].align === 'right' ? colX[i] + columns[i].width : colX[i]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  columns.forEach((col, i) => {
    doc.text(col.label.toUpperCase(), textX(i), y, { align: col.align || 'left' });
  });
  y += 8;
  doc.setDrawColor(...PDF_COLORS.hairline);
  doc.setLineWidth(1);
  doc.line(x, y, x + width, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.setFillColor(...PDF_COLORS.surfaceAlt);
      doc.rect(x, y - 10.5, width, 18, 'F');
    }
    doc.setTextColor(...PDF_COLORS.secondary);
    row.forEach((cell, i) => {
      doc.text(String(cell), textX(i), y, { align: columns[i].align || 'left' });
    });
    y += 18;
  });

  return y + 8;
}

/** Cadre léger arrondi autour d'une image de graphique capturée. */
export function framedImage(doc, { x, y, width, height, imageData }) {
  const pad = 8;
  doc.setFillColor(...PDF_COLORS.surface);
  doc.setDrawColor(...PDF_COLORS.hairline);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, width, height + pad * 2, 8, 8, 'FD');
  doc.addImage(imageData, 'PNG', x + pad, y + pad, width - pad * 2, height);
  return y + height + pad * 2;
}

/** Ajoute le pied de page (trait + libellé + numéro) sur toutes les pages, puis télécharge. */
export function finalizeReport(doc, { filename, footerLabel }) {
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount  = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_COLORS.hairline);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, pageHeight - 34, pageWidth - MARGIN, pageHeight - 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(footerLabel || 'IDS Secure Transport — Document confidentiel', MARGIN, pageHeight - 20);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 20, { align: 'right' });
  }

  doc.save(filename);
}

import html2canvas from 'html2canvas';
import {
  createReportDocument, sectionTitle, metaLine, statCards, framedImage, finalizeReport, PDF_COLORS,
} from './pdfReportKit';

const CHART_SECTIONS = [
  { id: 'chart-file-activity',   caption: 'Activité des fichiers (envoyés / reçus)' },
  { id: 'chart-file-extensions', caption: 'Répartition par extension' },
  { id: 'chart-ad-accounts',     caption: 'Comptes Active Directory' },
  { id: 'chart-top-senders',     caption: 'Top 20 utilisateurs (total, tous historiques)' },
];

const CARD_BG = '#1e293b'; // bg-slate-800 — fond utilisé lors de la capture (identique à l'écran)
const IMG_PAD = 8;

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = Number(bytes);
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(1)} ${units[i]}`;
}

const formatDateLabel = (isoDate) => {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
};

/**
 * Génère le rapport PDF de la console admin : en-tête avec logos, résumé
 * KPI en cartes, puis les graphiques de la vue d'ensemble (capturés depuis
 * le DOM déjà affiché à l'écran).
 *
 * @param {{ stats: object, startDate?: string, endDate?: string }} params
 */
export async function exportAdminReportPDF({ stats, startDate, endDate }) {
  const { doc, margin, pageWidth, pageHeight, y: headerY } = await createReportDocument({
    title: "Rapport d'activité",
    subtitle: "IDS Secure Transport — Port Autonome d'Abidjan",
  });

  const contentWidth = pageWidth - margin * 2;
  let y = headerY;

  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  y = metaLine(doc, { x: margin, y, text: `Généré le ${generatedAt}` });
  if (startDate && endDate) {
    y = metaLine(doc, { x: margin, y, text: `Période sélectionnée : du ${formatDateLabel(startDate)} au ${formatDateLabel(endDate)}` });
  }
  y += 8;

  // ── Résumé KPI ─────────────────────────────────────────────────────────
  y = sectionTitle(doc, { x: margin, y, text: 'Résumé' });
  y = statCards(doc, {
    x: margin, y, width: contentWidth,
    items: [
      { label: 'Utilisateurs',       value: stats?.totalUsers ?? '–',        accent: PDF_COLORS.blue },
      { label: 'Transferts totaux',  value: stats?.totalFiles ?? '–',        accent: PDF_COLORS.aqua },
      { label: 'Liens actifs',       value: stats?.activeLinks ?? '–',       accent: PDF_COLORS.violet },
      { label: 'Volume total',       value: formatSize(stats?.totalSize),    accent: PDF_COLORS.amber },
    ],
  });

  // ── Graphiques ─────────────────────────────────────────────────────────
  for (const { id, caption } of CHART_SECTIONS) {
    const node = document.getElementById(id);
    if (!node) continue;

    // eslint-disable-next-line no-await-in-loop
    const canvas = await html2canvas(node, { backgroundColor: CARD_BG, scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth  = contentWidth - IMG_PAD * 2;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    if (y + 20 + imgHeight + IMG_PAD * 2 + 20 > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    y = sectionTitle(doc, { x: margin, y, text: caption });
    y = framedImage(doc, { x: margin, y, width: contentWidth, height: imgHeight, imageData: imgData });
    y += 22;
  }

  finalizeReport(doc, {
    filename: `rapport-activite-${new Date().toISOString().slice(0, 10)}.pdf`,
    footerLabel: 'IDS Secure Transport — Document confidentiel',
  });
}

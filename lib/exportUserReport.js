import {
  createReportDocument, sectionTitle, metaLine, statCards, simpleTable, finalizeReport, PDF_COLORS,
} from './pdfReportKit';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = Number(bytes);
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(1)} ${units[i]}`;
}

const formatDateTimeLabel = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

/**
 * Génère un rapport PDF pour un utilisateur (fichiers envoyés/reçus, volume,
 * taux d'utilisation, types de fichiers) — en-tête avec logos, KPI en
 * cartes, tableau des extensions. Document jsPDF uniquement (pas de
 * graphique affiché à l'écran pour ce rapport, donc pas de capture DOM).
 *
 * @param {object} data Réponse de GET /admin/users/:id/stats
 */
export async function exportUserReportPDF(data) {
  const { user, startDate, endDate, filesSent, filesReceived, volumeSent, usageRatePercent, extensions } = data;

  const { doc, margin, pageWidth, y: headerY } = await createReportDocument({
    title: 'Rapport utilisateur',
    subtitle: "IDS Secure Transport — Port Autonome d'Abidjan",
  });

  const contentWidth = pageWidth - margin * 2;
  let y = headerY;

  y = metaLine(doc, { x: margin, y, text: `Généré le ${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}` });
  y = metaLine(doc, { x: margin, y, text: `Période : du ${formatDateTimeLabel(startDate)} au ${formatDateTimeLabel(endDate)}` });
  y += 8;

  // ── Identité ───────────────────────────────────────────────────────────
  y = sectionTitle(doc, { x: margin, y, text: 'Utilisateur' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(`${user.firstName} ${user.lastName}`, margin, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.secondary);
  const identity = [
    `Email : ${user.email}`,
    `Organisation : ${user.organisation || '—'}`,
    `Rôle : ${user.role}`,
    `Type de compte : ${user.isInternalUser ? 'Interne (AD)' : 'Externe'}`,
  ];
  identity.forEach((line) => { doc.text(line, margin, y); y += 14; });
  y += 10;

  // ── Activité ───────────────────────────────────────────────────────────
  y = sectionTitle(doc, { x: margin, y, text: 'Activité sur la période' });
  y = statCards(doc, {
    x: margin, y, width: contentWidth,
    items: [
      { label: 'Fichiers envoyés',   value: filesSent,             accent: PDF_COLORS.blue },
      { label: 'Fichiers reçus',     value: filesReceived,         accent: PDF_COLORS.aqua },
      { label: 'Volume envoyé',      value: formatSize(volumeSent), accent: PDF_COLORS.amber },
      { label: "Taux d'utilisation", value: `${usageRatePercent}%`, accent: PDF_COLORS.violet },
    ],
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Taux d'utilisation = part de l'activité de cet utilisateur (envois + réceptions) dans l'activité totale de la plateforme sur la même période.", margin, y, { maxWidth: contentWidth });
  y += 22;

  // ── Types de fichiers envoyés ──────────────────────────────────────────
  y = sectionTitle(doc, { x: margin, y, text: 'Types de fichiers envoyés' });

  if (!extensions?.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('Aucun fichier envoyé sur cette période.', margin, y);
  } else {
    const total = extensions.reduce((sum, e) => sum + e.count, 0);
    simpleTable(doc, {
      x: margin, y, width: contentWidth,
      columns: [
        { label: 'Extension', width: contentWidth * 0.5, align: 'left' },
        { label: 'Fichiers',  width: contentWidth * 0.25, align: 'right' },
        { label: 'Part',      width: contentWidth * 0.25, align: 'right' },
      ],
      rows: extensions.map((e) => {
        const pct = total > 0 ? Math.round((e.count / total) * 1000) / 10 : 0;
        return [e.extension === 'autres' ? 'Autres' : `.${e.extension}`, String(e.count), `${pct}%`];
      }),
    });
  }

  const safeName = `${user.firstName}-${user.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  finalizeReport(doc, {
    filename: `rapport-utilisateur-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`,
    footerLabel: 'IDS Secure Transport — Document confidentiel',
  });
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format an ISO date string to a readable local date/time.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return '–';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trigger a file download from a Blob response.
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'fichier';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Extract an error message from an Axios error response.
 * @param {import('axios').AxiosError} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getErrorMessage(error, fallback = 'Une erreur est survenue.') {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Get initials from a name string.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Map a file MIME type / extension to a label.
 * @param {string} filename
 * @returns {string}
 */
export function getFileTypeLabel(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    png: 'Image',
    jpg: 'Image',
    jpeg: 'Image',
    gif: 'Image',
    zip: 'Archive',
    rar: 'Archive',
  };
  return map[ext] || ext.toUpperCase();
}


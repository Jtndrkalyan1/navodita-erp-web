/**
 * PDF utility functions for authenticated PDF viewing and printing
 */

/**
 * Open/Download PDF with authentication
 * Fetches the PDF as a blob with the auth token and saves it to Downloads.
 * Filename is derived from the URL path (e.g. /api/pdf/invoice/5 -> invoice.pdf)
 */
export async function openPdf(url) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch PDF');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Use filename from Content-Disposition header (set by server with document number)
    let filename = 'document.pdf';
    try {
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].trim();
      } else {
        // Fallback: derive from URL path
        const parts = url.replace(/^\/api\/pdf\//, '').split('/').filter(Boolean);
        if (parts.length >= 2) {
          filename = `${parts[0]}-${parts[1]}.pdf`;
        } else if (parts.length === 1) {
          filename = `${parts[0]}.pdf`;
        }
      }
    } catch { /* use default */ }

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    alert('Failed to download PDF. Please try again.');
  }
}

/**
 * Print PDF with authentication
 * Fetches the PDF as a blob with the auth token and prints it
 */
export async function printPdf(url) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch PDF');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Remove any existing print frame
    const existing = document.getElementById('pdf-print-frame');
    if (existing) existing.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'pdf-print-frame';
    // Position off-screen but still rendered (display:none causes blank prints in Safari/Chrome)
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.overflow = 'hidden';
    printFrame.src = blobUrl;
    document.body.appendChild(printFrame);
    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      }, 500);
      setTimeout(() => {
        document.body.removeChild(printFrame);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    };
  } catch (err) {
    console.error('Error printing PDF:', err);
    alert('Failed to generate PDF for printing. Please try again.');
  }
}

/**
 * Download PDF with authentication
 */
export async function downloadPdf(url, filename) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch PDF');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    alert('Failed to download PDF. Please try again.');
  }
}

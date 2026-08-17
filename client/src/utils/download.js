// Extracts the filename the server actually sent via Content-Disposition,
// since the fallback docx-to-pdf conversion can return a .docx file even
// when a .pdf was requested — trusting a hardcoded extension here would
// silently mislabel the download.
export const filenameFromResponse = (response, fallback) => {
  const disposition = response.headers?.['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) return match[1];
  }
  return fallback;
};

export const downloadBlobResponse = (response, fallbackFilename) => {
  const filename = filenameFromResponse(response, fallbackFilename);
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

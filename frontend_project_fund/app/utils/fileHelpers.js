// Utility helpers for resolving document/file metadata into display-friendly values.

/**
 * Attempt to resolve the most appropriate display name for an attachment/document.
 * The backend payload contains the file name under various fields depending on
 * the context (legacy APIs, new endpoints, nested managed file objects, etc.).
 *
 * This helper consolidates the different possibilities and returns the first
 * non-empty string it can find. As a final fallback it tries to derive the name
 * from any available path/URL before returning the provided fallback label.
 *
 * @param {object} doc - Document/attachment payload from the API.
 * @param {string} fallback - Value used when no name could be derived.
 * @returns {string}
 */
export function resolveDocumentFileName(doc, fallback = 'document') {
  const firstString = (candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
    return null;
  };

  const directName = firstString([
    doc?.original_name,
    doc?.original_filename,
    doc?.filename,
    doc?.file_name,
    doc?.display_name,
    doc?.name,
    doc?.title,
    doc?.document_name,
    doc?.document_title,
    doc?.File?.original_name,
    doc?.File?.original_filename,
    doc?.File?.filename,
    doc?.File?.file_name,
    doc?.File?.display_name,
    doc?.file?.original_name,
    doc?.file?.original_filename,
    doc?.file?.filename,
    doc?.file?.file_name,
    doc?.file?.display_name,
    doc?.Document?.original_name,
    doc?.Document?.original_filename,
  ]);

  if (directName) return directName;

  const pathCandidate = firstString([
    doc?.file_path,
    doc?.File?.file_path,
    doc?.file?.file_path,
    doc?.path,
    doc?.File?.path,
    doc?.file?.path,
    doc?.file_url,
    doc?.url,
    doc?.File?.url,
    doc?.file?.url,
  ]);

  if (pathCandidate) {
    const segments = pathCandidate.split(/[\\/]/).filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  }

  return fallback;
}


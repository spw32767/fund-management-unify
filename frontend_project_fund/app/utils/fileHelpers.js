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
  const toCandidateStrings = (values) => {
    const results = [];
    for (const value of values) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          results.push(trimmed);
        }
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        results.push(String(value));
      }
    }
    return results;
  };

  const collectKeys = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return [];
    return keys.map((key) => obj?.[key]);
  };

  const nameKeys = [
    'original_name',
    'original_filename',
    'file_original_name',
    'filename',
    'file_name',
    'display_name',
    'name',
    'title',
    'document_name',
    'document_title',
    'document_filename',
    'fileTitle',
    'fileLabel',
    'label',
    'caption',
  ];

  const nestedSources = [
    doc,
    doc?.File,
    doc?.file,
    doc?.Document,
    doc?.document,
    doc?.Attachment,
    doc?.attachment,
    doc?.DocumentFile,
    doc?.document_file,
    doc?.ManagedFile,
    doc?.managed_file,
    doc?.FileMetadata,
    doc?.file_metadata,
    doc?.FileInfo,
    doc?.file_info,
    doc?.storage,
    doc?.meta,
  ].filter(Boolean);

  for (const source of nestedSources) {
    const directName = toCandidateStrings(collectKeys(source, nameKeys))[0];
    if (directName) {
      return directName;
    }
  }

  const pathKeys = [
    'file_path',
    'path',
    'stored_path',
    'storage_path',
    'file_url',
    'url',
    'download_url',
    'signed_url',
  ];

  for (const source of nestedSources) {
    const candidate = toCandidateStrings(collectKeys(source, pathKeys))[0];
    if (candidate) {
      const segments = candidate.split(/[\\/]/).filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
      return candidate;
    }
  }

  return fallback;
}


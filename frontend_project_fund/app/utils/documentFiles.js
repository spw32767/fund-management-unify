export const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        return trimmed;
      }
      continue;
    }
    return value;
  }
  return undefined;
};

const extractStoredFileName = (storedPath) => {
  if (typeof storedPath !== 'string' || storedPath.trim() === '') {
    return null;
  }
  try {
    const normalized = storedPath.split('?')[0];
    const segments = normalized.split('/').filter(Boolean);
    if (!segments.length) return null;
    return segments[segments.length - 1];
  } catch (error) {
    return null;
  }
};

const pickFileObject = (doc) => {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  const candidates = [
    doc.file,
    doc.File,
    doc.document_file,
    doc.DocumentFile,
    doc.attachment,
    doc.Attachment,
    doc.managed_file,
    doc.ManagedFile,
    doc.file_info,
    doc.fileInfo,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return null;
};

const pickDocumentStoredPath = (doc, fileObject) => {
  return (
    pickFirstNonEmpty(
      fileObject?.stored_path,
      fileObject?.storedPath,
      fileObject?.file_path,
      fileObject?.filePath,
      fileObject?.path,
      fileObject?.url,
      doc?.stored_path,
      doc?.storedPath,
      doc?.file_path,
      doc?.filePath,
      doc?.path,
    ) ?? null
  );
};

const pickDocumentMimeType = (doc, fileObject) => {
  return (
    pickFirstNonEmpty(
      doc?.mime_type,
      doc?.MimeType,
      fileObject?.mime_type,
      fileObject?.MimeType,
      fileObject?.content_type,
      fileObject?.contentType,
    ) ?? null
  );
};

const pickDocumentFileId = (doc, fileObject) => {
  return (
    pickFirstNonEmpty(
      doc?.file_id,
      doc?.FileID,
      doc?.fileId,
      fileObject?.file_id,
      fileObject?.FileID,
      fileObject?.id,
      fileObject?.fileId,
    ) ?? null
  );
};

const pickDocumentOriginalName = (doc, fileObject, storedPath) => {
  return (
    pickFirstNonEmpty(
      fileObject?.original_name,
      fileObject?.OriginalName,
      fileObject?.original_filename,
      fileObject?.file_original_name,
      fileObject?.display_name,
      fileObject?.file_name,
      extractStoredFileName(storedPath),
      doc?.stored_path && extractStoredFileName(doc.stored_path),
      doc?.storedPath && extractStoredFileName(doc.storedPath),
    ) ?? null
  );
};

const pickDocumentDisplayName = (originalName, fallbackLabel) => {
  if (originalName && typeof originalName === 'string') {
    return originalName;
  }
  return fallbackLabel ?? null;
};

/**
 * Resolve a document-like object into normalized managed file metadata that can be
 * safely used by the UI.
 *
 * @param {object} doc - Submission document payload (may contain File/file nested objects)
 * @param {number} [index] - Optional zero-based index for fallback naming
 * @returns {{
 *   fileId: (number|string|null),
 *   hasFile: boolean,
 *   originalName: (string|null),
 *   displayName: (string|null),
 *   downloadName: (string|null),
 *   storedPath: (string|null),
 *   mimeType: (string|null),
 *   file: (object|null)
 * }}
 */
export const resolveDocumentFile = (doc, index) => {
  const fallbackLabel =
    typeof index === 'number' && Number.isFinite(index)
      ? `เอกสารที่ ${index + 1}`
      : 'ไม่พบชื่อไฟล์';

  const fileObject = pickFileObject(doc);
  const storedPath = pickDocumentStoredPath(doc, fileObject);
  const fileId = pickDocumentFileId(doc, fileObject);
  const originalName = pickDocumentOriginalName(doc, fileObject, storedPath);
  const displayName = pickDocumentDisplayName(originalName, fallbackLabel);

  return {
    fileId,
    hasFile: fileId !== null && fileId !== undefined,
    originalName,
    displayName,
    downloadName: originalName ?? extractStoredFileName(storedPath) ?? displayName,
    storedPath,
    mimeType: pickDocumentMimeType(doc, fileObject),
    file: fileObject ?? null,
  };
};

const getFileMetadataFromResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return null;
  }

  return (
    response.file ||
    response.data?.file ||
    response.data ||
    response.result?.file ||
    response.result ||
    null
  );
};

export const enrichDocumentsWithFileMetadata = async (
  documents,
  { fetchFileById, cache } = {}
) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return Array.isArray(documents) ? documents.map((doc, index) => ({
      ...doc,
      resolvedFile: resolveDocumentFile(doc, index),
    })) : [];
  }

  const metadataCache = cache instanceof Map ? cache : new Map();
  const fetcher = typeof fetchFileById === 'function' ? fetchFileById : null;

  const ensureFileMeta = async (fileId) => {
    if (fileId == null) return null;

    if (metadataCache.has(fileId)) {
      return metadataCache.get(fileId);
    }

    if (!fetcher) {
      metadataCache.set(fileId, null);
      return null;
    }

    try {
      const response = await fetcher(fileId);
      const meta = getFileMetadataFromResponse(response);
      metadataCache.set(fileId, meta ?? null);
      return meta ?? null;
    } catch (error) {
      console.warn('[documentFiles] Failed to fetch file metadata', fileId, error);
      metadataCache.set(fileId, null);
      return null;
    }
  };

  const enriched = await Promise.all(
    documents.map(async (doc, index) => {
      const baseResolved = resolveDocumentFile(doc, index);
      const fileId = baseResolved.fileId;
      let fileMeta = baseResolved.file ?? null;

      if ((!fileMeta || !fileMeta.original_name) && fileId != null) {
        fileMeta = await ensureFileMeta(fileId);
      }

      if (fileMeta) {
        const mergedDoc = {
          ...doc,
          file: doc?.file ?? fileMeta,
          File: doc?.File ?? fileMeta,
        };

        return {
          ...mergedDoc,
          resolvedFile: resolveDocumentFile({ ...mergedDoc, file: fileMeta }, index),
        };
      }

      return {
        ...doc,
        resolvedFile: baseResolved,
      };
    })
  );

  return enriched;
};


import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { performance } from 'perf_hooks';
import { patchDocument, PatchType, Paragraph, TextRun } from 'docx';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

const templateCandidates = (() => {
  const candidates = [];

  if (process.env.PUBLICATION_TEMPLATE_PATH) {
    candidates.push(process.env.PUBLICATION_TEMPLATE_PATH);
  }

  candidates.push(
    path.join(process.cwd(), 'public', 'templates', 'publication_reward_template.docx'),
    path.join(process.cwd(), '..', 'แบบฟอร์มสมัครรับ เงินรางวัลตีพิมพ์ - 2568.docx'),
  );

  return candidates;
})();

const resolveTemplatePath = async () => {
  for (const candidate of templateCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate
    }
  }

  return null;
};

const logScope = 'publication-summary';

const log = (level, event, metadata = {}) => {
  const entry = {
    scope: logScope,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  const serialized = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    default:
      console.log(serialized);
      break;
  }
};

const createParagraph = (text = '') => new Paragraph({
  children: [new TextRun({ text })],
});

const createParagraphPatch = (text = '') => ({
  type: PatchType.PARAGRAPH,
  children: [new TextRun({ text })],
});

const createDocumentPatch = (lines = []) => ({
  type: PatchType.DOCUMENT,
  children: (Array.isArray(lines) && lines.length > 0 ? lines : ['☑ ไม่พบรายการเอกสารแนบ'])
    .map((line) => createParagraph(line)),
});

const buildPatches = (placeholders = {}, documentLines = []) => {
  const patches = {};
  Object.entries(placeholders).forEach(([key, value]) => {
    if (key === 'document_line') {
      return;
    }
    patches[key] = createParagraphPatch(value ?? '');
  });

  patches.document_line = createDocumentPatch(documentLines);
  return patches;
};

const envDelimiter = process.platform === 'win32' ? ';' : path.delimiter;

const sanitizeEnvPaths = (value = '') =>
  value
    .split(envDelimiter)
    .map((candidate) => candidate.trim())
    .filter(Boolean);

const ensureSofficeExecutable = async (candidatePath) => {
  if (!candidatePath) {
    return [];
  }

  const normalized = path.normalize(candidatePath);

  try {
    const stats = await fs.stat(normalized);
    if (stats.isDirectory()) {
      const executables = process.platform === 'win32' ? ['soffice.exe'] : ['soffice', 'libreoffice'];
      return executables.map((name) => path.join(normalized, name));
    }

    if (stats.isFile()) {
      return [normalized];
    }
  } catch (error) {
    log('warn', 'libreoffice.env_candidate.invalid', {
      candidatePath,
      error: error?.message,
    });
  }

  return [normalized];
};

const defaultLibreOfficeLocations = () => {
  if (process.platform === 'win32') {
    return [
      'C:/Program Files/LibreOffice/program/soffice.exe',
      'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
      'soffice.exe',
    ];
  }

  const unixCandidates = [
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/snap/bin/libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    'soffice',
    'libreoffice',
  ];

  return unixCandidates;
};

const resolveOnPath = async (command) => {
  const locator = process.platform === 'win32' ? 'where' : 'which';

  try {
    const { stdout } = await execFileAsync(locator, [command]);
    const match = stdout
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .find(Boolean);

    if (match) {
      await fs.access(match);
      return match;
    }
  } catch (error) {
    log('warn', 'libreoffice.locator.failed', {
      command,
      locator,
      error: error?.message,
    });
  }

  return null;
};

const resolveLibreOffice = async () => {
  const envCandidates = sanitizeEnvPaths(process.env.LIBREOFFICE_PATH || '');
  const envResolved = await Promise.all(envCandidates.map((candidate) => ensureSofficeExecutable(candidate)));
  const flattenedEnv = envResolved.flat();

  const candidates = [...flattenedEnv, ...defaultLibreOfficeLocations()];
  const seen = new Set();
  const attempts = [];

  log('info', 'libreoffice.resolve.start', {
    envCandidates,
    totalCandidates: candidates.length,
  });

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    const hasPathSeparators = /[\\/]/.test(candidate) || candidate.includes(':');
    attempts.push(candidate);

    if (hasPathSeparators) {
      try {
        const stats = await fs.stat(candidate);
        if (stats.isFile()) {
          log('info', 'libreoffice.resolve.success', { resolvedPath: candidate, method: 'absolute' });
          return candidate;
        }
      } catch (error) {
        log('warn', 'libreoffice.resolve.candidate_missing', {
          candidate,
          error: error?.message,
        });
      }
      continue;
    }

    const resolved = await resolveOnPath(candidate);
    if (resolved) {
      log('info', 'libreoffice.resolve.success', { resolvedPath: resolved, method: 'which', candidate });
      return resolved;
    }
  }

  log('error', 'libreoffice.resolve.failed', { attempts });
  throw new Error('LIBREOFFICE_NOT_INSTALLED');
};

const readFileSafe = async (filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return data;
  } catch (error) {
    log('error', 'filesystem.read_failed', {
      filePath,
      error: error?.message,
    });
    throw error;
  }
};

const convertDocxToPdf = async (docxBuffer) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pub-summary-'));
  const docxPath = path.join(tmpDir, `summary-${randomUUID()}.docx`);
  const pdfPath = path.join(tmpDir, `${path.parse(docxPath).name}.pdf`);

  log('info', 'conversion.prepare', { tmpDir, docxPath, pdfPath });

  try {
    await fs.writeFile(docxPath, docxBuffer);
    log('info', 'conversion.file_written', { docxPath, size: docxBuffer.length });

    let libreOffice;
    try {
      libreOffice = await resolveLibreOffice();
    } catch (error) {
      const enhancedError = new Error('LIBREOFFICE_NOT_INSTALLED');
      enhancedError.cause = error;
      throw enhancedError;
    }

    const start = performance.now();
    try {
      const { stdout, stderr } = await execFileAsync(
        libreOffice,
        ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
        {
          timeout: 30000,
        },
      );

      log('info', 'conversion.command.completed', {
        executable: libreOffice,
        durationMs: Math.round(performance.now() - start),
        stdout: stdout?.trim(),
        stderr: stderr?.trim(),
      });
    } catch (error) {
      log('error', 'conversion.command.failed', {
        executable: libreOffice,
        durationMs: Math.round(performance.now() - start),
        code: error?.code,
        signal: error?.signal,
        stdout: error?.stdout?.trim(),
        stderr: error?.stderr?.trim(),
        error: error?.message,
      });
      throw error;
    }

    const pdfBuffer = await readFileSafe(pdfPath);
    log('info', 'conversion.read_pdf.success', { pdfPath, size: pdfBuffer.length });
    return pdfBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
    log('info', 'conversion.cleanup.completed', { tmpDir });
  }
};

export async function POST(request) {
  try {
    if (request.bodyUsed) {
      log('warn', 'request.body.already_used');
      return NextResponse.json(
        { error: 'REQUEST_BODY_ALREADY_READ', details: 'Request body stream has already been consumed.' },
        { status: 409 },
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch (parseError) {
      log('error', 'request.body.parse_failed', { error: parseError?.message });
      return NextResponse.json(
        { error: 'INVALID_JSON', details: 'Unable to parse request body as JSON.' },
        { status: 400 },
      );
    }

    const { placeholders, documentLines } = payload || {};

    if (!placeholders || typeof placeholders !== 'object') {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: 'placeholders object is required' }, { status: 400 });
    }

    const templatePath = await resolveTemplatePath();

    if (!templatePath) {
      return NextResponse.json({ error: 'TEMPLATE_NOT_AVAILABLE' }, { status: 503 });
    }

    const templateBuffer = await readFileSafe(templatePath);
    const patches = buildPatches(placeholders, documentLines);

    const patchedDocx = await patchDocument({
      outputType: 'nodebuffer',
      data: templateBuffer,
      patches,
      keepOriginalStyles: true,
    });

    try {
      const pdfBuffer = await convertDocxToPdf(patchedDocx);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="publication-summary.pdf"',
        },
      });
    } catch (conversionError) {
      log('error', 'conversion.failed', {
        error: conversionError?.message,
        code: conversionError?.code,
      });

      if (conversionError?.message === 'LIBREOFFICE_NOT_INSTALLED') {
        if (process.env.PUBLICATION_SUMMARY_FALLBACK_FORMAT === 'docx') {
          log('warn', 'conversion.fallback_to_docx');
          return new NextResponse(patchedDocx, {
            status: 200,
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': 'attachment; filename="publication-summary.docx"',
            },
          });
        }

        return NextResponse.json(
          {
            error: 'LIBREOFFICE_NOT_INSTALLED',
            details:
              'LibreOffice (soffice) is required on the server to convert the official DOCX template to PDF. Install LibreOffice and redeploy the service to enable exact template rendering.',
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: 'DOCX_TO_PDF_FAILED', details: conversionError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    log('error', 'summary.generation_failed', { error: error?.message });
    return NextResponse.json({ error: 'SUMMARY_GENERATION_FAILED', details: error.message }, { status: 500 });
  }
}
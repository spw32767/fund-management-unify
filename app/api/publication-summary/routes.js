import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
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

const candidateLibreOfficePaths = () => {
  if (process.platform === 'win32') {
    return [
      'C:/Program Files/LibreOffice/program/soffice.exe',
      'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
      'soffice.exe',
    ];
  }

  return ['soffice', 'libreoffice'];
};

const resolveLibreOffice = async () => {
  const candidates = candidateLibreOfficePaths();
  for (const candidate of candidates) {
    try {
      if (candidate.includes('/') || candidate.includes('\\') || candidate.includes(':')) {
        await fs.access(candidate);
        return candidate;
      }
      await execFileAsync('which', [candidate]);
      return candidate;
    } catch (error) {
      // Try the next candidate
    }
  }
  throw new Error('LibreOffice CLI (soffice) not found on server');
};

const convertDocxToPdf = async (docxBuffer) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pub-summary-'));
  const docxPath = path.join(tmpDir, `summary-${randomUUID()}.docx`);
  const pdfPath = path.join(tmpDir, `${path.parse(docxPath).name}.pdf`);

  try {
    await fs.writeFile(docxPath, docxBuffer);

    let libreOffice;
    try {
      libreOffice = await resolveLibreOffice();
    } catch (error) {
      const enhancedError = new Error('LIBREOFFICE_NOT_INSTALLED');
      enhancedError.cause = error;
      throw enhancedError;
    }

    await execFileAsync(libreOffice, ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath], {
      timeout: 30000,
    });

    const pdfBuffer = await fs.readFile(pdfPath);
    return pdfBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

export async function POST(request) {
  try {
    const payload = await request.json();
    const { placeholders, documentLines } = payload || {};

    if (!placeholders || typeof placeholders !== 'object') {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: 'placeholders object is required' }, { status: 400 });
    }

    const templatePath = await resolveTemplatePath();

    if (!templatePath) {
      return NextResponse.json({ error: 'TEMPLATE_NOT_AVAILABLE' }, { status: 503 });
    }

    const templateBuffer = await fs.readFile(templatePath);
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
      console.error('DOCX to PDF conversion failed:', conversionError);

      if (conversionError?.message === 'LIBREOFFICE_NOT_INSTALLED') {
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
    console.error('Failed to generate publication summary document:', error);
    return NextResponse.json({ error: 'SUMMARY_GENERATION_FAILED', details: error.message }, { status: 500 });
  }
}
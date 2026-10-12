export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData } = req.body || {};
    if (!fileData?.data) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const buffer = Buffer.from(fileData.data, 'base64');
    const mimeType = fileData.mimeType || '';

    if (
      mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('csv') ||
      mimeType.includes('markdown')
    ) {
      return res.json({ success: true, text: buffer.toString('utf-8') });
    }

    if (mimeType.includes('pdf') || mimeType === 'application/pdf') {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        await parser.load();
        const pdfText = await parser.getText();
        await parser.destroy().catch(() => {});
        if (pdfText?.text && pdfText.text.trim().length > 20) {
          return res.json({ success: true, text: pdfText.text.trim().slice(0, 50000) });
        }
      } catch (err: any) {
        console.warn('PDF extraction error:', err);
      }
    }

    return res.json({ success: true, text: '' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to extract text' });
  }
}

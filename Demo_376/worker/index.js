import { Worker } from 'bullmq';
import { Client } from '@elastic/elasticsearch';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { spawn } from 'node:child_process';

const esClient = new Client({ node: process.env.ELASTIC_URL || 'http://elasticsearch:9200' });

/**
 * preprocesses extracted PDF text before NLP and indexing
 * will remove:
 * - footers
 * - page numbers
 * - bullet symbols
 * - layout noise
 * @param {String} text
 * @returns cleaned text
 */
function cleanText(text) {
  return text
    .replace(/-\s*\n/g, "")
    .replace(/[•●▪■]/g, "")
    .replace(/\bPage\s*\d+\b/g, "")
    .replace(/\b\d+\s*\/\s*\d+\b/g, "")
    .replace(/\s+/g, " ");


}

function runNLP(text) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['nlp.py']);
    let output = '';
    let error = '';

    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${error}`));
      } else {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error(`Failed to parse NLP output: ${output}`));
        }
      }
    });
  });
}

const worker = new Worker('file-indexing', async (job) => {
  const { internalName, originalName, mimetype } = job.data;
  const filePath = path.join('/app/uploads', internalName);

  console.log(`Processing: ${originalName} (${mimetype})`);

  try {
    // check file
    const buffer = await fs.readFile(filePath);
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      extractedText = data.text;
    } else if (mimetype === 'text/plain' || originalName.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      console.warn(`Unsupported file type: ${mimetype}. Attempting to read as text.`);
      extractedText = buffer.toString('utf-8');
    }

    // preprocessing
    console.log(`Cleaning text for: ${originalName}`);
    const cleanedText = cleanText(extractedText);

    // nlp enrichment
    console.log(`Running NLP for: ${originalName}`);
    let nlpResults = {};
    try {
      nlpResults = await runNLP(cleanedText);
    } catch (nlpErr) {
      console.error(`NLP Processing failed for ${originalName}: ${nlpErr.message}`);
    }

    await esClient.index({
      index: 'documents',
      document: {
        title: originalName,
        internalName: internalName,
        content: cleanedText,
        nlp: nlpResults,
        timestamp: new Date()
      }
    });

    console.log(`Success: ${originalName}`);
  } catch (err) {
    console.error(`Failed: ${err.message}`);
  }
}, { connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 } });

console.log('Worker started and waiting for jobs...');
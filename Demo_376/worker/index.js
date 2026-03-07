import { Worker } from 'bullmq';
import { Client } from '@elastic/elasticsearch';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { spawn } from 'node:child_process';

const esClient = new Client({ node: process.env.ELASTIC_URL || 'http://elasticsearch:9200' });

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
    
    console.log(`Running NLP for: ${originalName}`);
    let nlpResults = {};
    try {
      nlpResults = await runNLP(extractedText);
    } catch (nlpErr) {
      console.error(`NLP Processing failed for ${originalName}: ${nlpErr.message}`);
    }

    await esClient.index({
      index: 'documents',
      document: {
        title: originalName,
        internalName: internalName,
        content: extractedText,
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
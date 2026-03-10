import { Worker } from 'bullmq';
import { Client } from '@elastic/elasticsearch';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { spawn } from 'node:child_process';

const esClient = new Client({ node: process.env.ELASTIC_URL || 'http://elasticsearch:9200' });



function cleanText(text) {
  // remove
  // - footers
  // - page numbers
  // - bullet symbols
  // - layout noise
  return text
    .replace(/-\s*\n/g, "")
    .replace(/[•●▪■]/g, "")
    .replace(/\bPage\s*\d+\b/g, "")
    .replace(/\b\d+\s*\/\s*\d+\b/g, "")
    .replace(/\s+/g, " ");
}


function chunkText(text, size = 180, overlap = 30) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunk = words.slice(i, i + size).join(" ");
    chunks.push(chunk);
    if (i + size >= words.length) break;
  }

  return chunks;
}


function embed(text) {
  return new Promise((resolve, reject) => {
    // make python instance
    const py_instance = spawn("python3", ["embed.py"]);

    let output = "";
    let error = "";

    py_instance.stdin.write(text);
    py_instance.stdin.end();


    py_instance.stdout.on("data", data => output += data.toString());
    py_instance.stderr.on("data", data => error += data.toString());

    py_instance.on("close", code => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${error}`));
      } else {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error(`Failed to parse embedding output: ${output}`));
        }
      }
    })
  })
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


    // chunk text
    console.log(`Splitting ${originalName} into chunks`)
    const chunks = chunkText(cleanedText);
    console.log(`${chunks.length} chunks extracted from ${originalName}`)

    // nlp enrichment
    console.log(`Running NLP for: ${originalName}`);
    let nlpResults = {};
    try {
      nlpResults = await runNLP(cleanedText);
    } catch (nlpErr) {
      console.error(`NLP Processing failed for ${originalName}: ${nlpErr.message}`);
    }

    // await esClient.index({
    //   index: 'documents',
    //   document: {
    //     title: originalName,
    //     internalName: internalName,
    //     content: cleanedText,
    //     nlp: nlpResults,
    //     timestamp: new Date()
    //   }
    // });


  for (let i = 0; i < chunks.length; i++) {

    // embed chunk
    console.log(`Embedding ${originalName} chunk ${i + 1}`)
    const vector = await embed(chunks[i])

    // insert chunk and embedding
    await esClient.index({
      index: 'documents',
      document: {
        doc_id: internalName,
        chunk_index: i,
        title: originalName,
        content: chunks[i],
        embedding: vector,
        nlp: nlpResults,
        timestamp: new Date()
      }
  });
}

    console.log(`Success: ${originalName}`);
  } catch (err) {
    console.error(`Failed: ${err.message}`);
  }
}, { connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 } });

console.log('Worker started and waiting for jobs...');
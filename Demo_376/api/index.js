import express from 'express';
import multer from 'multer';
import { Queue } from 'bullmq';
import { Client } from '@elastic/elasticsearch';
import path from 'node:path';
import { spawn } from 'node:child_process';

const app = express();
const esClient = new Client({ node: process.env.ELASTIC_URL || 'http://elasticsearch:9200' });
const upload = multer({ dest: '/app/uploads/' });

const fileQueue = new Queue('file-indexing', {
  connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
});

function embedQuery(text) {
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

app.use(express.static('public'));

app.post('/upload', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).send('No files uploaded.');

  const jobs = req.files.map(file =>
    fileQueue.add('index-job', {
      internalName: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype
    })
  );

  await Promise.all(jobs);

  res.json({ message: `${req.files.length} files queued!`, count: req.files.length });
});

app.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  console.log(`embedding query: ${q}`)
  const query_vector = await embedQuery(q);

  try {
    const result = await esClient.search({
      index: 'documents',
      size: 20,
      query: {
        script_score: {
          query: {
            match: { content: q }
          },
          script: {
            source: "cosineSimilarity(params.query_vector, 'embedding') + _score",
            params: { query_vector }
          }
        }
      },
      highlight: {
        fields: { content: {} },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      }
    });


    // const hits = result.hits.hits.map(hit => ({
    //   title: hit._source.title,
    //   internalName: hit._source.internalName,
    //   snippet: hit.highlight?.content ? hit.highlight.content[0] : "No preview available",
    //   nlp: hit._source.nlp || {}
    // }));

    // group chunks by doc id
    const hits = result.hits.hits;

    const grouped = {};
    for (const hit of hits) {
      const docId = hit._source.doc_id;

      if (!grouped[docId]) {
        grouped[docId] = {
          doc_id: docId,
          title: hit._source.title,
          snippet: hit.highlight?.content?.[0] || "No preview availasble",
          chunks: []
        };
      }

      grouped[docId].chunks.push({
        chunk_index: hit._source.chunk_index,
        snippet: hit.highlight?.content?.[0] || null
      });
    }

    console.log(Object.values(grouped));

    res.json(Object.values(grouped));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed. Is the index created?" });
  }
});

app.get('/documents', async (req, res) => {
  try {
    const result = await esClient.search({
      index: 'documents',
      query: { match_all: {} },
      _source: ['title', 'internalName', 'timestamp', 'nlp.summary']
    });

    const docs = result.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch documents." });
  }
});

app.get('/stats/clustering', async (req, res) => {
  try {
    const result = await esClient.search({
      index: 'documents',
      query: { match_all: {} },
      _source: ['title', 'content']
    });

    const docs = result.hits.hits.map(hit => ({
      title: hit._source.title,
      content: hit._source.content
    }));

    if (docs.length === 0) {
      return res.json([]);
    }

    const pythonProcess = spawn('python3', ['clustering.py']);
    let output = '';
    let errorOutput = '';

    pythonProcess.stdin.write(JSON.stringify(docs));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Clustering script error: ${errorOutput}`);
        return res.status(500).json({ error: 'Clustering failed' });
      }
      try {
        res.json(JSON.parse(output));
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse clustering output' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process clustering." });
  }
});

app.get('/download/:id', (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', req.params.id);
  const fileName = req.query.name || 'document';
  res.download(filePath, fileName);
});

app.listen(3000, () => console.log('Web UI ready at http://localhost:3000'));
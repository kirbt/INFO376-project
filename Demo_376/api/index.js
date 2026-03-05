import express from 'express';
import multer from 'multer';
import { Queue } from 'bullmq';
import { Client } from '@elastic/elasticsearch';
import path from 'node:path';

const app = express();
const esClient = new Client({ node: process.env.ELASTIC_URL || 'http://elasticsearch:9200' });
const upload = multer({ dest: '/app/uploads/' });

const fileQueue = new Queue('file-indexing', {
  connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
});

app.use(express.static('public'));

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  await fileQueue.add('index-job', {
    internalName: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype
  });

  res.json({ message: 'File queued!', id: req.file.filename });
});

app.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const result = await esClient.search({
      index: 'documents',
      query: {
        match: { content: q } 
      },
      highlight: {
        fields: { content: {} },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      }
    });

    const hits = result.hits.hits.map(hit => ({
      title: hit._source.title,
      internalName: hit._source.internalName,
      snippet: hit.highlight?.content ? hit.highlight.content[0] : "No preview available",
      nlp: hit._source.nlp || {}
    }));

    res.json(hits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed. Is the index created?" });
  }
});

app.get('/download/:id', (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', req.params.id);
  const fileName = req.query.name || 'document';
  res.download(filePath, fileName);
});

app.listen(3000, () => console.log('🚀 Web UI ready at http://localhost:3000'));
import { Client } from '@elastic/elasticsearch';

const es = new Client({
  node: process.env.ELASTIC_URL || 'http://elasticsearch:9200'
});

async function setup() {
  try {

    const exists = await es.indices.exists({ index: 'documents' });

    if (exists) {
      console.log('Deleting old index');
      await es.indices.delete({ index: 'documents' });
    }

    console.log('Recreating index with dense vector mapping ');
    await es.indices.create({
      index: 'documents',
      mappings: {
        properties: {
          content: { type: 'text' },
          embedding: {
            type: 'dense_vector',
            dims: 768,
            index: true,
            similarity: 'cosine'
          },
          doc_id: { type: 'keyword' },
          chunk_index: { type: 'integer' },
          title: { type: 'keyword' },
          internalName: { type: 'keyword' },
          timestamp: { type: 'date' }
        }
      }
    });

    console.log('Index created.');
  } catch (err) {
    console.error('Error creating index:', err);
  }
}

setup();

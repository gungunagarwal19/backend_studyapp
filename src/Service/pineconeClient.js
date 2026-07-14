const { Pinecone } = require('@pinecone-database/pinecone');

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = 'edgy';
const getPineconeIndex = () => pinecone.index(indexName);


module.exports = { pinecone, getPineconeIndex };

import { MongoClient } from 'mongodb';

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const mongoUriBase = process.env.MONGO_URI_BASE;
  const mongoUriSuffix = process.env.MONGO_URI_SUFFIX;
  const databaseName = process.env.COLLECTION_NAME;

  if (!mongoUriBase || !mongoUriSuffix || !databaseName) {
    throw new Error(
      'Missing required MongoDB env vars: MONGO_URI_BASE, COLLECTION_NAME, MONGO_URI_SUFFIX',
    );
  }

  const uri = `${mongoUriBase}${databaseName}${mongoUriSuffix}`;

  const client = new MongoClient(uri);

  // Connect to the MongoDB cluster
  await client.connect();
  cachedClient = client;
  return cachedClient;
}

export async function getItems(collection?: string) {
  const client = await getClient();
  const collectionName = collection || process.env.COLLECTION_NAME;

  if (!collectionName) {
    throw new Error('Collection name is required');
  }

  return client.db().collection(collectionName).find().toArray();
}

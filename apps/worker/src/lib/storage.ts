import { Client } from 'minio';
import { getOptionalEnv } from './env';

const endpoint = getOptionalEnv(process.env.MINIO_ENDPOINT, 'localhost');
const port = Number(getOptionalEnv(process.env.MINIO_PORT, '9000'));
const accessKey = getOptionalEnv(process.env.MINIO_ACCESS_KEY, 'minioadmin');
const secretKey = getOptionalEnv(process.env.MINIO_SECRET_KEY, 'minioadmin');
const useSSL = ['1', 'true', 'yes'].includes(
  getOptionalEnv(process.env.MINIO_USE_SSL, 'false').toLowerCase(),
);
const bucket = getOptionalEnv(process.env.MINIO_BUCKET, 'codejudge');

const client = new Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey,
  region: getOptionalEnv(process.env.MINIO_REGION, 'us-east-1'),
});

let bucketReady = false;

export async function ensureBucketExists(): Promise<void> {
  if (bucketReady) return;
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
  }
  bucketReady = true;
}

export async function putArtifactObject(
  objectKey: string,
  body: string | Buffer,
  metadata?: Record<string, string>,
): Promise<void> {
  await ensureBucketExists();
  await client.putObject(bucket, objectKey, body, undefined, metadata);
}

export async function getObjectString(objectKey: string): Promise<string> {
  await ensureBucketExists();
  const stream = await client.getObject(bucket, objectKey);

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '../utils/logger';

const logger = new Logger('ImageStorage');
const s3Client = new S3Client({});
const BUCKET_NAME = process.env.CHARACTER_ASSETS_BUCKET;
const PRESIGNED_URL_EXPIRY = 604800;

if (!BUCKET_NAME) {
  throw new Error('CHARACTER_ASSETS_BUCKET environment variable not set');
}

function getImageKey(characterId: string): string {
  return `${characterId}/avatar.png`;
}

export async function uploadCharacterImage(
  characterId: string,
  imageBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const key = getImageKey(characterId);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      Metadata: {
        characterId,
        uploadDate: new Date().toISOString(),
      },
    })
  );

  logger.info('Image uploaded to S3', { characterId, key });
  return key;
}

export async function getPresignedImageUrl(characterId: string): Promise<string> {
  const key = getImageKey(characterId);

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  logger.info('Generated presigned URL', { characterId });
  return url;
}

export async function deleteCharacterImages(characterId: string): Promise<void> {
  const key = getImageKey(characterId);

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );

  logger.info('Images deleted from S3', { characterId });
}

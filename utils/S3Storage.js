import S3 from 'aws-sdk/clients/s3.js';

import fs from 'fs';
import { env } from 'process';

const s3 = new S3({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const s3Store = (bucket, key, data) => {

  if (process.env.ENV === 'development') {
    bucket += '-test';
  }

  const params = {
    Bucket: bucket,
    Body: JSON.stringify(data),
    Key: key,
    ContentType: 'application/json; charset=utf-8',
  };

  return s3.upload(params).promise();
};

export const s3StoreFile = (bucket, key, data) => {
  const file = fs.createReadStream(data.path);

  if (process.env.ENV === 'development') {
    bucket += '-test';
  }

  const params = {
    Bucket: bucket,
    Body: file,
    Key: key,
  };

  return s3.upload(params).promise();
};



export const s3GetFile = (bucket, path) => {

  if (process.env.ENV === 'development') {
    bucket += '-test';
  }
  
  const params = {
    Bucket: bucket,
    Key: path,
  };

  return s3.getObject(params).promise();
};

export const s3DeleteFile = (bucket, path) => {
  const params = { Bucket: bucket, Key: path };

  return s3.deleteObject(params).promise();
};

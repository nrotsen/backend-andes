import AWS from 'aws-sdk';

import dotenv from 'dotenv';

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'Users';

export const upsertUser = async (user) => {
  const params = {
    TableName: TABLE_NAME,
    Item: user,
  };
  return dynamoClient.put(params).promise();
};

export default null;

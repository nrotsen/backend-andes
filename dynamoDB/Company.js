import AWS from 'aws-sdk';

import dotenv from 'dotenv';

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'Companies';

export const getCompany = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      companyId: id,
    },
  };
  return dynamoClient.get(params).promise();
};

export const getAllCompanies = async () => {
  const params = {
    TableName: TABLE_NAME,
  };
  return dynamoClient.scan(params).promise();
};

export const useOneDocument = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      companyId: id,
    },
    UpdateExpression: 'set availableContracts = availableContracts - :val',
    ExpressionAttributeValues: {
      ':val': 1,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoClient.update(params).promise();
};

export default null;

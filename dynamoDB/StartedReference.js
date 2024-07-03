import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "StartedDocuments";

export const upsertStartedDocument = async (doc) => {
  const params = {
    TableName: TABLE_NAME,
    Item: doc,
  };
  return dynamoClient.put(params).promise();
};

export const getAllStartedDocs = async (id) => {
  const companyId = `${id}`;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ExpressionAttributeValues: {
      ":id": companyId,
    },
    ScanIndexForward: false,
    Limit: 100,
  };
  return dynamoClient.query(params).promise();
};

export default null;

// upsertUser, getUser

import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "CompanyDocuments";

export const getAllCompanyDocs = async (id) => {
  const companyId = `${id}`;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ExpressionAttributeValues: {
      ":id": companyId,
    },
    ReturnValues: "UPDATED_NEW",
    ScanIndexForward: false,
    Limit: 100,
  };
  return dynamoClient.query(params).promise();
};

export const createCompanyDoc = async (params) => {
  const newDoc = {
    ...params,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newDoc,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export const deleteCompanyDocReference = async (docId, companyId) => {
  const paramsForDb = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      documentId: docId,
    },
  };
  return dynamoClient.delete(paramsForDb).promise();
};

export default null;

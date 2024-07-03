import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "Folders";

export const getAllCompanyFolders = async (id) => {
  const companyId = typeof id === "string" ? id : id.toString();
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ScanIndexForward: false,
    Limit: 100,
    ExpressionAttributeValues: {
      ":id": companyId,
    },
  };
  return dynamoClient.query(params).promise();
};

export const deleteFolder = async (folderId, companyId) => {
  const paramsForDb = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      folderId,
    },
  };
  return dynamoClient.delete(paramsForDb).promise();
};

export const updateFolderName = async (companyId, folderId, newName) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      folderId,
    },
    UpdateExpression: "set folderName = :val",
    ExpressionAttributeValues: {
      ":val": newName,
    },
    ReturnValues: "UPDATED_NEW",
  };

  return dynamoClient.update(params).promise();
};

export const createFolder = async (params) => {
  const newFolder = {
    ...params,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newFolder,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export default null;

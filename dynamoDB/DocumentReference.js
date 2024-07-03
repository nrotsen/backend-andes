import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "DocumentReference";

export const upsertDocReference = async (params) => {
  const newDocRef = {
    companyId: params.companyId,
    documentId: params.date,
    companyName: params.companyName,
    documentType: params.documentType,
    filePath: params.filePath,
    fileName: params.fileName || params.documentType,
    dateCreated: Date.now(),
    userId: params.userId,
    createdBy: params.createdBy,
    creatorPhotoUrl: params.creatorPhotoUrl,
    part1: null,
    part2: null,
    part3: null,
    part4: null,
    comments: [],
    amount: null,
    folder: null,
    description: null,
    versionId: params.versionId,
    versionNumber: params.versionNumber,
    delFlg: 0,
    size: params.size,
    updateDate: params.updateDate,
    format: params.format,
    andesDockerDoc: params.andesDockerDoc,
    expirationDate: params.expirationDate || null,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newDocRef,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export const editDocReference = async (params) => {
  const newDocRef = {
    ...params,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newDocRef,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export const getAllCompanyDocs = async (id) => {
  const companyId = typeof id === "string" ? id : id.toString();
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ExpressionAttributeValues: {
      ":id": companyId,
    },
    ScanIndexForward: false,
    Limit: 1500,
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.query(params).promise();
};

export const getAllCompanyDocsWithStartKey = async (id, documentId) => {
  const companyId = typeof id === "string" ? id : id.toString();
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ExpressionAttributeValues: {
      ":id": companyId,
    },
    ScanIndexForward: false,
    Limit: 1500,
    ExclusiveStartKey: {
      companyId,
      documentId,
    },
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.query(params).promise();
};

export const getOneDoc = async (id, companyId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :pk and begins_with(documentId, :sk)",
    ExpressionAttributeValues: {
      ":pk": companyId, // Replace with the actual partition key value
      ":sk": id, // Replace with the actual sort key prefix
    },
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.query(params).promise();
};

export const deleteDocReference = async (docId, companyId) => {
  const paramsForDb = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      documentId: docId,
    },
  };
  return dynamoClient.delete(paramsForDb).promise();
};

export const removeDocumentFolder = async (companyId, docId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      documentId: docId,
    },
    UpdateExpression: "set folder = :val",
    ExpressionAttributeValues: {
      ":val": null,
    },
    ReturnValues: "UPDATED_NEW",
  };

  return dynamoClient.update(params).promise();
};

export default null;

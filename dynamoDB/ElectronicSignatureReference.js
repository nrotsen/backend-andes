import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "ElectronicSignatureReference";

export const upsertElectronicSignatureReference = async (params) => {
  const newDate = Date.now();
  const date = newDate.toString();

  const newDocRef = {
    companyId: params.companyId,
    signatureId: date,
    companyName: params.companyName,
    signedFilePath: params.signedFilePath,
    fileName: params.fileName,
    dateCreated: date,
    userId: params.userId,
    createdBy: params.createdBy,
    creatorPhotoUrl: params.creatorPhotoUrl,
    delFlg: 0,
    updateDate: date,
    format: "pdf",
    status: "pending",
    documentToken: params.documentToken,
    documentId: params.documentId,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newDocRef,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export const getAllCompanySignatures = async (id) => {
  const companyId = typeof id === "string" ? id : id.toString();
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ScanIndexForward: false,
    Limit: 1900,
    ExpressionAttributeValues: {
      ":id": companyId,
    },
  };
  return dynamoClient.query(params).promise();
};

export const getAllCompanySignaturesWithStartKey = async (id, signatureId) => {
  const companyId = typeof id === "string" ? id : id.toString();
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "companyId = :id",
    ScanIndexForward: false,
    Limit: 1900,
    ExpressionAttributeValues: {
      ":id": companyId,
    },
    ExclusiveStartKey: {
      companyId,
      signatureId,
    },
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.query(params).promise();
};

export const deleteSignature = async (signatureId, companyId) => {
  const paramsForDb = {
    TableName: TABLE_NAME,
    Key: {
      companyId,
      signatureId: signatureId,
    },
  };
  return dynamoClient.delete(paramsForDb).promise();
};

export const editSignatureRef = async (params) => {
  const newSignatureRef = {
    ...params,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newSignatureRef,
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.put(paramsForDb).promise();
};

export default null;

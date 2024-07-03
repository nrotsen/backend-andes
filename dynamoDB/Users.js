import AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "Users";

export const getUser = async (id, companyId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :pk",
    ExpressionAttributeValues: {
      ":pk": id, // Replace with the actual partition key value
    },
    ReturnConsumedCapacity: "INDEXES",
  };
  return dynamoClient.query(params).promise();
};

export const createUser = async (params) => {
  const newUser = {
    // primary key
    userId: params.userId,
    // GSI
    companyId: params.companyId || "00000",
    photoUrl: params.photoUrl || "",
    role: params.role || "user",
    documentShare: params.documentShare,
    createdAt: params.createdAt,
    name: params.name,
    email: params.email,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: newUser,
  };
  return dynamoClient.put(paramsForDb).promise();
};

export const updateUser = async (params) => {
  const updatedUser = {
    ...params,
  };

  const paramsForDb = {
    TableName: TABLE_NAME,
    Item: updatedUser,
  };
  return dynamoClient.put(paramsForDb).promise();
};

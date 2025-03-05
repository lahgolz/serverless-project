const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { S3 } = require("@aws-sdk/client-s3");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");

const app = express();

const upload = multer({ dest: "uploads/" });

const MEMES_TABLE = process.env.MEMES_TABLE;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

function runAsyncWrapper(callback) {
  return function (request, response, next) {
    callback(request, response, next).catch(next);
  };
}

app.use(express.json());

app.post(
  "/upload",
  upload.single("file"),
  runAsyncWrapper(async (request, response) => {
    const file = request.file;
    const filePath = file.path;
    const fileName = file.originalname;

    // TODO: upload the file to S3
  })
);

app.post(
  "/generate",
  runAsyncWrapper(async (request, response) => {
    // TODO: generate meme
  })
);

app.get(
  "/memes",
  runAsyncWrapper(async (request, response) => {
    // TODO: list memes
  })
);

app.get(
  "/meme/:id",
  runAsyncWrapper(async (request, response) => {
    // TODO: get meme by id
  })
);

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

exports.handler = serverless(app);

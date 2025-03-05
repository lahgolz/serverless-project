const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();

const s3 = new S3Client({
  endpoint: "http://localhost:9000",
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const upload = multer({ dest: "uploads/" });

const MEMES_TABLE = process.env.MEMES_TABLE;
const MINIO_BUCKET = "memes-bucket";
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
    if (!request.file) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    const { path, mimetype, originalname, buffer } = request.file;

    try {
      // Create a unique filename with UUID
      const fileId = uuidv4();
      const fileExtension = originalname.split('.').pop();
      const objectKey = `${fileId}.${fileExtension}`;

      const uploadParams = {
        Bucket: MINIO_BUCKET,
        Key: objectKey,
        Body: buffer,
        ContentType: mimetype
      };

      await s3.send(new PutObjectCommand(uploadParams));

      return response.json({
        message: "File uploaded successfully",
        fileId: fileId,
        url: `${process.env.API_URL || request.protocol + '://' + request.get('host')}/uploads/${objectKey}`
      });
    } catch (error) {
      console.error("Upload error:", error);
      return response.status(500).json({ error: "Failed to upload file" });
    }
  })
);

app.get(
  "/uploads/:filename",
  runAsyncWrapper(async (request, response) => {
    
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

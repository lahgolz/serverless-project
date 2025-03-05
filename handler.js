const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const Minio = require("minio");

const express = require("express");
const serverless = require("serverless-http");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET;

(async () => {
  const bucketExists = await minioClient
    .bucketExists(bucketName)
    .catch((error) => {
      console.error(error);
    });

  if (!bucketExists) {
    await minioClient.makeBucket(bucketName, "eu-west-3").catch((error) => {
      console.error(error);
    });

    console.log("Bucket created successfully");
  }
})();

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

// Ensure bucket exists
(async () => {
  try {
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET);
      console.log(`Bucket '${MINIO_BUCKET}' created successfully`);
    }
  } catch (error) {
    console.error(`Error checking/creating bucket: ${error}`);
  }
})();

app.use(express.json());

app.post(
  "/upload",
  upload.single("file"),
  runAsyncWrapper(async (request, response) => {
    if (!request.file) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    const file = request.file;

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return response.status(400).json({
        error: "Invalid file type. Please upload an image file.",
        uploadedMimeType: file.mimetype,
      });
    }

    const filePath = file.path;
    const fileName = file.originalname;
    const extension = fileName.split(".").pop();
    const newFileName = `${uuidv4()}.${extension}`;

    try {
      const result = await minioClient.fPutObject(
        MINIO_BUCKET,
        newFileName,
        filePath
      );

      console.log(result);

      response.json({
        success: true,
        filename: newFileName,
      });
    } catch (error) {
      console.error("Error uploading to MinIO:", error);
      return response.status(500).json({
        error: "Failed to upload file",
        details: error.message,
      });
    }
  })
);

app.get(
  "/uploads/:filename",
  runAsyncWrapper(async (request, response) => {
    const fileName = request.params.filename;

    const stat = await minioClient
      .statObject(bucketName, fileName)
      .catch(() => {
        response.status(404).send("File not found");
      });

    if (!stat) {
      return;
    }

    const fileStream = await minioClient.getObject(MINIO_BUCKET, fileName);
    fileStream.pipe(response);

    fileStream.on("error", (error) => {
      console.error(error);
    });

    fileStream.on("end", () => {
      response.end();
    });
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

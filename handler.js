const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const express = require("express");
const serverless = require("serverless-http");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const generateMeme = require("./generate-meme");

const app = express();

const s3 = new S3Client({
  endpoint: "http://localhost:4569",
  forcePathStyle: true,
});

// Setup multer to store files in memory instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const MEMES_TABLE = process.env.MEMES_TABLE;
const MEMES_BUCKET = process.env.MEMES_BUCKET;
const client = new DynamoDBClient({
  region: "localhost",
  endpoint: "http://localhost:8000",
});
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

    const { mimetype, originalname, buffer } = request.file;

    const binaryBuffer = Buffer.from(buffer.toString(), "base64");
    const fileId = uuidv4();
    const fileExtension = originalname.split(".").pop().toLowerCase();
    const key = `uploads/${fileId}.${fileExtension}`;

    const result = await s3
      .send(
        new PutObjectCommand({
          Bucket: MEMES_BUCKET,
          Key: key,
          Body: binaryBuffer,
          ContentType: mimetype,
          ACL: "public-read",
        })
      )
      .catch((error) => {
        console.error("Error uploading file:", error);
      });

    if (!result || result.$metadata.httpStatusCode !== 200) {
      return response.status(500).json({ error: "Failed to upload file" });
    }

    return response.json({
      success: true,
      url: `http://localhost:4569/memes-bucket/${key}`,
    });
  })
);

app.post(
  "/generate",
  runAsyncWrapper(async (request, response) => {
    const { imageUrl, topText, bottomText, title } = request.body;

    if (!imageUrl) {
      return response.status(400).json({ error: "imageUrl is required" });
    }

    if (!imageUrl.startsWith("http")) {
      return response
        .status(400)
        .json({ error: "imageUrl must be a valid URL" });
    }

    if (!title) {
      return response.status(400).json({ error: "title is required" });
    }

    if (!topText && !bottomText) {
      return response
        .status(400)
        .json({ error: "Either topText or bottomText is required" });
    }

    const memeBuffer = await generateMeme({
      topText: topText ?? "",
      bottomText: bottomText ?? "",
      imageUrl,
    }).catch((error) => {
      console.error("Error generating meme:", error);
    });

    if (!memeBuffer) {
      return response.status(500).json({ error: "Failed to generate meme" });
    }

    const memeId = uuidv4();
    const filename = imageUrl.split("/").pop();
    const templateKey = `uploads/${filename}`;
    const memeKey = `memes/${memeId}.png`;

    const result = await s3
      .send(
        new PutObjectCommand({
          Bucket: MEMES_BUCKET,
          Key: memeKey,
          Body: memeBuffer,
          ContentType: "image/png",
          ACL: "public-read",
        })
      )
      .catch((error) => {
        console.error("Error uploading file:", error);
      });

    if (!result || result.$metadata.httpStatusCode !== 200) {
      return response.status(500).json({ error: "Failed to upload file" });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: MEMES_BUCKET,
        Key: templateKey,
      })
    );

    await docClient.send(
      new PutCommand({
        TableName: MEMES_TABLE,
        Item: {
          id: memeId,
          title,
          imageUrl: `http://localhost:4569/memes-bucket/${memeKey}`,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return response.json({
      success: true,
      url: `http://localhost:4569/memes-bucket/${memeKey}`,
    });
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

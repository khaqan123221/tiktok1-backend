const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require("uuid");
const dotenv = require('dotenv').config();

dotenv.config();
// Azure Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const CONTAINER_NAME = 'new';


// Initialize the Express app
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend communication
app.use(cors());

// Initialize multer (middleware for handling file uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Azure Blob Service Client
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Upload route for video files
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blobName = req.file.originalname; // Using the original file name
  const stream = req.file.buffer; // Video data in buffer format
  const blobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // Upload the video data to Azure Blob Storage
    await blobClient.uploadData(stream, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype, // Set the MIME type for the file
      },
    });

    res.status(200).send({
      message: 'Video uploaded successfully!',
      videoUrl: blobClient.url, // Returning the blob URL
    });
  } catch (error) {
    console.error('Error uploading video to Azure:', error);
    res.status(500).send('Error uploading video.');
  }
});

let videoMetadata = {};

// Endpoint to fetch all videos with IDs
app.get("/getVideos", async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    videoMetadata = {}; // Reset metadata on each fetch
    

    // Iterate through blobs in the container
    for await (const blob of containerClient.listBlobsFlat()) {
      const id = uuidv4(); // Generate a unique ID for each video
      videoMetadata[id] = {
        id,
        name: blob.name,
        url: `${containerClient.url}/${blob.name}`,
      };
    }

    res.json(Object.values(videoMetadata)); // Return an array of video metadata
  } catch (error) {
    console.error("Error fetching video URLs:", error);
    res.status(500).json({ error: "Failed to fetch video URLs" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

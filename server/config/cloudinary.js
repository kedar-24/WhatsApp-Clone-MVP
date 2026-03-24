const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Force HTTPS
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "whatsapp-clone/others";
    let resource_type = "auto";

    if (file.mimetype.startsWith("image/")) {
      folder = "whatsapp-clone/images";
      resource_type = "image";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "whatsapp-clone/videos";
      resource_type = "video";
    } else if (file.mimetype === "application/pdf" || file.originalname.match(/\.(doc|docx)$/i)) {
      folder = "whatsapp-clone/files";
      resource_type = "raw"; 
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Supported: Images, PDF, DOC, DOCX"), false);
    }
  },
});

module.exports = { cloudinary, upload };

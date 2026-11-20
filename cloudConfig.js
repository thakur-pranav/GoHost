const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Minimal multer storage engine that streams uploads straight to Cloudinary.
// (Replaces multer-storage-cloudinary, which only supports the old,
// vulnerable cloudinary v1 SDK.)
class CloudinaryStorage {
  constructor(options) {
    this.options = options;
  }

  _handleFile(req, file, cb) {
    const upload = cloudinary.uploader.upload_stream(
      { resource_type: "image", ...this.options },
      (err, result) => {
        if (err) return cb(err instanceof Error ? err : new Error(err.message || "Image upload failed"));
        cb(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
      }
    );
    file.stream.pipe(upload);
  }

  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename).then(() => cb(null), cb);
  }
}

const ALLOWED_FORMATS = ["png", "jpg", "jpeg", "webp"];

const cloudinaryConfigured = Boolean(
  process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET
);

let storage;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });

  storage = new CloudinaryStorage({
    folder: "GoHost_DEV",
    allowed_formats: ALLOWED_FORMATS,
  });
} else {
  // Fallback for local development: save uploads to public/uploads.
  const uploadDir = path.join(__dirname, "public", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
  console.log("Cloudinary not configured - saving uploads to public/uploads");
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "WARNING: running in production without Cloudinary. Hosts like Render wipe local files " +
      "on every restart/deploy, so uploaded images WILL disappear. Set CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET."
    );
  }
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (ALLOWED_FORMATS.includes(ext)) return cb(null, true);
  cb(new Error(`Only ${ALLOWED_FORMATS.join(", ")} images are allowed`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Normalises req.file into the { url, filename } shape stored on a listing.
const fileToImage = (file) => {
  if (!file) return undefined;
  if (cloudinaryConfigured) {
    return { url: file.path, filename: file.filename };
  }
  return { url: `/uploads/${file.filename}`, filename: file.filename };
};

// Removes a previously uploaded image. Seed/default images (and any image
// we didn't upload) are left alone.
const deleteImage = async (image) => {
  if (!image || !image.filename || image.filename === "listingimage") return;
  try {
    if (cloudinaryConfigured && image.url && image.url.includes("cloudinary")) {
      await cloudinary.uploader.destroy(image.filename);
    } else if (image.url && image.url.startsWith("/uploads/")) {
      await fs.promises.unlink(path.join(__dirname, "public", "uploads", path.basename(image.filename)));
    }
  } catch (err) {
    console.log("Could not delete image:", err.message);
  }
};

module.exports = { cloudinary, cloudinaryConfigured, upload, fileToImage, deleteImage };

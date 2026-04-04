import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const uploadOnCloudinary = async (localfilepath: string) => {
  try {
    if (!localfilepath) return null;

    // 1. Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });

    // 2. File has been uploaded successfully
    // Now remove the file from the local temp filesystem
    fs.unlinkSync(localfilepath);

    return response;
  } catch (error) {
    // 3. If the upload operation failed, remove the locally saved temporary file
    fs.unlinkSync(localfilepath);
    return null;
  }
};

export { uploadOnCloudinary };

/**
 * Extract public_id from Cloudinary URL
 * @param imageUrl - Cloudinary URL
 * @returns public_id or null if extraction fails
 */
const extractPublicIdFromUrl = (imageUrl: string): string | null => {
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
    // We need to extract: folder/image

    const urlParts = imageUrl.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      return null;
    }

    // Get everything after 'upload' and version (if present)
    let pathParts = urlParts.slice(uploadIndex + 1);

    // Remove version if present (starts with 'v' followed by numbers)
    if (pathParts[0] && /^v\d+$/.test(pathParts[0])) {
      pathParts = pathParts.slice(1);
    }

    // Join the remaining parts and remove file extension
    const publicIdWithExtension = pathParts.join("/");
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

export const deleteFromCloudinary = async (
  imageUrl: string,
): Promise<boolean> => {
  try {
    // Extract public_id from Cloudinary URL
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
    // Public ID: folder/image

    const publicId = extractPublicIdFromUrl(imageUrl);

    if (!publicId) {
      console.error("Could not extract public_id from URL:", imageUrl);
      return false;
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log("✅ File deleted from Cloudinary:", publicId);
      return true;
    } else {
      console.warn("⚠️ File not found in Cloudinary:", publicId);
      return false;
    }
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    return false;
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param imageUrls - Array of Cloudinary URLs
 * @returns Number of successfully deleted files
 */
export const deleteMultipleFromCloudinary = async (
  imageUrls: string[],
): Promise<number> => {
  let deletedCount = 0;

  for (const url of imageUrls) {
    const deleted = await deleteFromCloudinary(url);
    if (deleted) deletedCount++;
  }

  console.log(
    `🗑️ Deleted ${deletedCount}/${imageUrls.length} files from Cloudinary`,
  );
  return deletedCount;
};

/**
 * Delete file from Cloudinary using public_id directly
 * @param publicId - Cloudinary public_id (e.g., "folder/image")
 * @returns true if deleted successfully, false otherwise
 */
export const deleteFromCloudinaryByPublicId = async (
  publicId: string,
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log("✅ File deleted from Cloudinary:", publicId);
      return true;
    } else {
      console.warn("⚠️ File not found in Cloudinary:", publicId);
      return false;
    }
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    return false;
  }
};

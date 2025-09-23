/**
 * Get full URL for images served by backend
 * @param {string} imagePath - Relative path from backend
 * @returns {string|null} - Full URL or null
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // If already a full URL, return as-is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Determine base URL based on environment
  const baseUrl =
    process.env.REACT_APP_ENV === "production"
      ? "https://fioriforrent.com"
      : "http://localhost:3000";

  // Clean up path
  const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;

  return `${baseUrl}/${cleanPath}`;
};

/**
 * Get API base URL without /api suffix
 * Useful for file downloads, image URLs, etc.
 */
export const getBaseUrl = () => {
  const apiUrl =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
  return apiUrl.replace("/api", "");
};

export function cloudinaryPoster(mediaUrl) {
  try {
    const url = new URL(mediaUrl);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return "";
    if (!url.pathname.includes("/video/upload/")) return "";
    url.pathname = url.pathname
      .replace("/video/upload/q_auto/", "/video/upload/")
      .replace("/video/upload/", "/video/upload/so_0,w_960,h_600,c_fill,q_auto/")
      .replace(/\.(mp4|webm|mov)$/i, ".jpg");
    return url.toString();
  } catch {
    return "";
  }
}

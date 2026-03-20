export const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const getFavicon = (url: string) => {
  const domain = getDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";
};

export const isOralVenue = (venue: string) => /\boral\b/i.test(venue);

export const formatVenue = (venue: string) => venue.replace(/\s*\(oral\)\s*/i, "").trim();

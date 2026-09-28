import sanitizeHtml from "sanitize-html";

// Stories are written straight to Supabase by the browser, so stored HTML is untrusted.
// The story page runs it on the server with a strict allowlist of what the editor produces.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike",
    "h1", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "a", "img", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeStoryHtml(html: string | null | undefined): string {
  return sanitizeHtml(html || "", OPTIONS);
}

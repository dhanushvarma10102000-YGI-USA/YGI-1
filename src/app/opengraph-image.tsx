import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "YourGuideInUSA - complete guide for international students in the USA";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 54%, #e6fffb 100%)",
          color: "#111827",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #4f46e5, #2f8f86)",
              color: "white",
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            Y
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 900 }}>{SITE_NAME}</div>
            <div style={{ fontSize: 22, color: "#475569" }}>Study, settle, and belong in the USA</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 0.98, letterSpacing: -3, fontWeight: 900, maxWidth: 920 }}>
            Complete Guide for International Students
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: "#475569", maxWidth: 850 }}>
            {DEFAULT_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 24, color: "#1f2937", fontWeight: 800 }}>
          <span>Housing</span>
          <span style={{ color: "#94a3b8" }}>•</span>
          <span>Visa</span>
          <span style={{ color: "#94a3b8" }}>•</span>
          <span>City guides</span>
          <span style={{ color: "#94a3b8" }}>•</span>
          <span>Student communities</span>
        </div>
      </div>
    ),
    size
  );
}


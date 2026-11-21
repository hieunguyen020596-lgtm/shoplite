import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E dùng thư mục build riêng để không đụng dev server (AD-30).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Next tự thêm đường dẫn của distDir vào tsconfig; giữ thay đổi đó ngoài tsconfig.json.
  typescript: process.env.NEXT_DIST_DIR ? { tsconfigPath: "tsconfig.e2e.json" } : undefined,
  // Không để `next dev` tự tạo/sửa AGENTS.md - giữ repo đúng như mã nguồn gốc.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

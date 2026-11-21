import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Ghi dữ liệu JSON nguyên tử qua file tạm gắn UUID rồi đổi tên sang đích.
 * Tự dọn file tạm nếu quá trình ghi hoặc đổi tên thất bại.
 */
export async function writeJsonFileAtomic(
  filePath: string,
  data: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tempFile, filePath);
  } catch (error) {
    await fs.unlink(tempFile).catch(() => {});
    throw error;
  }
}

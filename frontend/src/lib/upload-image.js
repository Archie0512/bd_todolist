/**
 * 图片上传工具：客户端校验 + 调用 Supabase Storage
 */
import { canUploadImageToCard, uploadCardImage } from "./supabase-client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

/**
 * 上传图片，返回公开 URL
 * @param {File} file - 用户选择的图片文件
 * @param {string} cardId - 所属卡片 ID
 * @param {boolean} isAdminFlag - 当前是否登录管理员
 * @throws {Error} 包含可显示给用户的中文错误信息
 * @returns {Promise<string>} 图片公开 URL
 */
export async function uploadImage(file, cardId, isAdminFlag) {
  if (!file) {
    throw new Error("未选择文件");
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("仅支持 JPEG / PNG / GIF / WebP / SVG 格式");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("图片大小不能超过 5MB");
  }
  if (!cardId) {
    throw new Error("无法确定目标卡片，请先保存卡片");
  }

  const { allowed, reason } = await canUploadImageToCard(cardId, isAdminFlag);
  if (!allowed) {
    if (reason === "lane_not_allowed") {
      throw new Error("匿名用户只能在「待分配」或「退回」列上传图片，请登录或移动卡片");
    }
    throw new Error("无法上传图片：卡片不存在或权限不足");
  }

  const publicUrl = await uploadCardImage(file, cardId);
  return publicUrl;
}

/**
 * utils/hashPassword.js — Mã hoá & xác minh mật khẩu
 * ─────────────────────────────────────────────────────
 * Hỗ trợ đồng thời 2 thuật toán để tương thích với hệ thống cũ:
 *
 *   bcrypt  (mới) — có built-in salt + cost factor 10 rounds → an toàn, chống brute force
 *   SHA256  (cũ)  — hash thuần từ hệ thống C# cũ, không có salt → kém an toàn hơn
 *
 * Luồng "lazy migration":
 *   1. User đăng nhập → verifyPassword() thử bcrypt trước
 *   2. Nếu là hash SHA256 cũ và đúng mật khẩu → trả về needsUpgrade: true
 *   3. auth.controller.js tự động re-hash bằng bcrypt và lưu lại DB
 *   → Người dùng không cần đổi mật khẩu, tự nâng cấp sau lần đăng nhập đầu tiên
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash SHA256 (tương thích với hệ thống cũ C#)
 */
const sha256 = (str) => {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
};

/**
 * Hash password bằng bcrypt (hệ thống mới)
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Verify password — hỗ trợ cả SHA256 (cũ) và bcrypt (mới)
 * Nếu là SHA256 → verify xong tự động upgrade lên bcrypt
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  // Thử bcrypt trước
  const isBcrypt = hashedPassword.startsWith('$2');
  if (isBcrypt) {
    return {
      valid: await bcrypt.compare(plainPassword, hashedPassword),
      needsUpgrade: false,
    };
  }

  // Thử SHA256 (hash cũ từ C#)
  const sha256Hash = sha256(plainPassword);
  const isOldHash = sha256Hash === hashedPassword;
  return {
    valid: isOldHash,
    needsUpgrade: isOldHash, // flag để upgrade lên bcrypt
  };
};

module.exports = { hashPassword, verifyPassword, sha256 };

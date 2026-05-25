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

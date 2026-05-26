const { query, execute } = require('../config/db');
const { success, error } = require('../utils/response');

/** GET /api/settings — trả về object {key: value} */
const getSettings = async (req, res) => {
  try {
    const rows = await query(`SELECT [Key], [Value] FROM Setting`, {});
    const data = {};
    for (const r of rows) data[r.Key] = r.Value;
    return success(res, data);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/** PUT /api/settings — cập nhật nhiều key cùng lúc */
const updateSettings = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    if (!updates || typeof updates !== 'object') {
      return error(res, 'Dữ liệu không hợp lệ', 400);
    }
    for (const [key, value] of Object.entries(updates)) {
      await execute(
        `IF EXISTS (SELECT 1 FROM Setting WHERE [Key]=@key)
           UPDATE Setting SET [Value]=@value WHERE [Key]=@key
         ELSE
           INSERT INTO Setting ([Key],[Value]) VALUES (@key,@value)`,
        { key, value: String(value) }
      );
    }
    return success(res, null, 'Đã lưu thiết lập');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { getSettings, updateSettings };

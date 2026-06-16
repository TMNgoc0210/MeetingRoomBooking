const { query, execute } = require('../config/db');
const { success, error } = require('../utils/response');

/** GET /api/settings — trả về object {key: value} */
const getSettings = async (req, res) => {
  try {
    const rows = await query(`SELECT "Key", "Value" FROM Setting`, {});
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
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return error(res, 'Dữ liệu không hợp lệ', 400);
    }
    for (const [key, value] of Object.entries(updates)) {
      await execute(
        `INSERT INTO Setting ("Key","Value") VALUES (@key,@value)
         ON CONFLICT ("Key") DO UPDATE SET "Value" = EXCLUDED."Value"`,
        { key, value: String(value) }
      );
    }
    return success(res, null, 'Đã lưu thiết lập');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { getSettings, updateSettings };

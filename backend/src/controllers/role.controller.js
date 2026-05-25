const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const roles = await query(
      `SELECT RoleID, Name, Description, CreatedAt FROM Role ORDER BY RoleID`,
      {}
    );
    return success(res, roles);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const getDetail = async (req, res) => {
  try {
    const role = await queryOne(
      `SELECT RoleID, Name, Description, CreatedAt FROM Role WHERE RoleID = @id`,
      { id: parseInt(req.params.id) }
    );
    if (!role) return notFound(res, 'Không tìm thấy vai trò');
    return success(res, role);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const addRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return badRequest(res, 'Tên vai trò không được để trống');
    const exists = await queryOne(`SELECT RoleID FROM Role WHERE Name = @name`, { name: name.trim() });
    if (exists) return badRequest(res, 'Tên vai trò đã tồn tại');
    const result = await execute(
      `INSERT INTO Role (Name, Description) VALUES (@name, @description)`,
      { name: name.trim(), description: description?.trim() || '' }
    );
    return success(res, { roleID: result.lastInsertRowid }, 'Đã thêm vai trò', 201);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const updateRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    if (!name?.trim()) return badRequest(res, 'Tên vai trò không được để trống');
    const role = await queryOne(`SELECT RoleID FROM Role WHERE RoleID = @id`, { id });
    if (!role) return notFound(res, 'Không tìm thấy vai trò');
    const dup = await queryOne(`SELECT RoleID FROM Role WHERE Name = @name AND RoleID != @id`, { name: name.trim(), id });
    if (dup) return badRequest(res, 'Tên vai trò đã tồn tại');
    await execute(
      `UPDATE Role SET Name = @name, Description = @description WHERE RoleID = @id`,
      { name: name.trim(), description: description?.trim() || '', id }
    );
    return success(res, null, 'Cập nhật vai trò thành công');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const deleteRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await queryOne(`SELECT RoleID FROM Role WHERE RoleID = @id`, { id });
    if (!role) return notFound(res, 'Không tìm thấy vai trò');
    await execute(`DELETE FROM Role WHERE RoleID = @id`, { id });
    return success(res, null, 'Đã xóa vai trò');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { getAll, getDetail, addRole, updateRole, deleteRole };

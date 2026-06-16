const { query, queryOne, execute } = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/hashPassword');
const { success, error, notFound, badRequest } = require('../utils/response');

function parseRoles(roleStr) {
  if (!roleStr) return [];
  return roleStr.split('|').map(s => {
    const idx = s.indexOf(':');
    return { RoleID: parseInt(s.slice(0, idx)), Name: s.slice(idx + 1) };
  });
}

async function syncUserRoles(userID, roleIDs) {
  await execute(`DELETE FROM "UserRole" WHERE "UserID" = @userID`, { userID });
  for (const rid of roleIDs) {
    await execute(
      `INSERT INTO "UserRole" ("UserID","RoleID")
       VALUES (@userID, @roleID)
       ON CONFLICT ("UserID","RoleID") DO NOTHING`,
      { userID, roleID: parseInt(rid) }
    );
  }
}

const ROLE_SUBQUERY = `(SELECT STRING_AGG(CAST(ur."RoleID" AS TEXT) || ':' || r."Name", '|')
  FROM "UserRole" ur JOIN "Role" r ON ur."RoleID" = r."RoleID"
  WHERE ur."UserID" = u."UserID") AS "_roleStr"`;

function attachRoles(user) {
  if (!user) return user;
  const { _roleStr, ...rest } = user;
  return { ...rest, assignedRoles: parseRoles(_roleStr) };
}

const getAllUsers = async (req, res) => {
  try {
    const { fullName, facultyID } = req.query;
    let sql = `
      SELECT u."UserID", u."FullName", u."Avatar", u."Roles", u."Visible",
             u."FacultyID", u."Email", u."Mobi", u."CreateBy", u."CreateDate",
             f."FacultyName", ${ROLE_SUBQUERY}
      FROM "User" u
      LEFT JOIN Faculty f ON u."FacultyID" = f."FacultyID"
      WHERE 1=1
    `;
    const params = {};
    if (fullName) { sql += ` AND u."FullName" LIKE '%' || @fullName || '%'`; params.fullName = fullName; }
    if (facultyID && parseInt(facultyID) > 0) { sql += ` AND u."FacultyID" = @facultyID`; params.facultyID = parseInt(facultyID); }
    sql += ` ORDER BY u."FullName"`;
    const users = await query(sql, params);
    return success(res, users.map(attachRoles));
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getAllUsersAdmin = async (req, res) => {
  try {
    const { fullName, facultyID } = req.query;
    let sql = `
      SELECT u."UserID", u."FullName", u."Avatar", u."Roles", u."Visible",
             u."FacultyID", u."Email", u."Mobi", u."CreateBy", u."CreateDate",
             f."FacultyName", ${ROLE_SUBQUERY}
      FROM "User" u
      LEFT JOIN Faculty f ON u."FacultyID" = f."FacultyID"
      WHERE 1=1
    `;
    const params = {};
    if (fullName) { sql += ` AND u."FullName" LIKE '%' || @fullName || '%'`; params.fullName = fullName; }
    if (facultyID && parseInt(facultyID) > 0) { sql += ` AND u."FacultyID" = @facultyID`; params.facultyID = parseInt(facultyID); }
    sql += ` ORDER BY u."FullName"`;
    const users = await query(sql, params);
    return success(res, users.map(attachRoles));
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getUserById = async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u."UserID", u."FullName", u."Avatar", u."Roles", u."Visible",
              u."FacultyID", u."Email", u."Mobi", u."CreateBy",
              f."FacultyName", ${ROLE_SUBQUERY}
       FROM "User" u
       LEFT JOIN Faculty f ON u."FacultyID" = f."FacultyID"
       WHERE u."UserID" = @userID`,
      { userID: req.params.id }
    );
    if (!user) return notFound(res, 'Không tìm thấy người dùng');
    return success(res, attachRoles(user));
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getUsersByFaculty = async (req, res) => {
  try {
    const users = await query(
      `SELECT "UserID","FullName","Avatar","Email","Mobi" FROM "User"
       WHERE "FacultyID" = @facultyID AND "Visible" = 1`,
      { facultyID: parseInt(req.params.facultyId) }
    );
    return success(res, users);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const addUser = async (req, res) => {
  try {
    const { userID, fullName, facultyID, mobi, email, visible, roles, password, avatar, createBy, roleIDs } = req.body;
    if (!userID || !fullName || !password) return badRequest(res, 'Thiếu thông tin bắt buộc: userID, fullName, password');
    const existing = await queryOne(`SELECT "UserID" FROM "User" WHERE "UserID" = @userID`, { userID });
    if (existing) return badRequest(res, 'Tài khoản đã tồn tại');
    const hashed = await hashPassword(password);
    await execute(
      `INSERT INTO "User" ("UserID","FullName","FacultyID","Mobi","Email","Visible","Roles","Password","Avatar","CreateBy","CreateDate")
       VALUES (@userID, @fullName, @facultyID, @mobi, @email, @visible, @roles, @password, @avatar, @createBy, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
      {
        userID, fullName, facultyID: parseInt(facultyID) || 0,
        mobi: mobi || '', email: email || '',
        visible: visible !== false ? 1 : 0,
        roles: roles === true || roles === 'true' ? 1 : 0,
        password: hashed, avatar: avatar || '/uploads/images/nopic.png',
        createBy: createBy || userID,
      }
    );
    if (Array.isArray(roleIDs) && roleIDs.length > 0) await syncUserRoles(userID, roleIDs);
    return success(res, { userID }, 'Thêm người dùng thành công', 201);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, facultyID, mobi, email, visible, roles, avatar, createBy, roleIDs } = req.body;
    const userID = req.params.id;
    const currentUser = await queryOne(`SELECT "Roles" FROM "User" WHERE "UserID" = @userID`, { userID });
    if (!currentUser) return notFound(res, 'Không tìm thấy người dùng');

    const requesterIsAdmin = req.user.roles === 1;
    if (!requesterIsAdmin && req.user.userID !== userID) return error(res, 'Không có quyền chỉnh sửa', 403);

    let newRoles = currentUser.Roles;
    if (requesterIsAdmin && req.user.userID !== userID) {
      newRoles = (roles === true || roles === 1 || roles === 'true' || roles === '1') ? 1 : 0;
    }
    if (userID === 'admin') newRoles = 1;

    await execute(
      `UPDATE "User" SET
         "FullName"=@fullName, "FacultyID"=@facultyID, "Mobi"=@mobi,
         "Email"=@email, "Visible"=@visible, "Roles"=@newRoles,
         "Avatar"=@avatar, "CreateBy"=@createBy
       WHERE "UserID" = @userID`,
      {
        fullName, facultyID: parseInt(facultyID) || null,
        mobi: mobi || '', email: email || '',
        visible: visible !== false ? 1 : 0, newRoles,
        avatar: avatar || '/uploads/images/nopic.png',
        createBy: createBy || req.user.userID, userID,
      }
    );
    if (requesterIsAdmin && Array.isArray(roleIDs)) await syncUserRoles(userID, roleIDs);
    return success(res, null, 'Cập nhật thành công');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const deleteUser = async (req, res) => {
  try {
    const userID = req.params.id;
    if (userID === 'admin') return badRequest(res, 'Không thể xoá tài khoản quản trị hệ thống');
    if (req.user.userID === userID) return badRequest(res, 'Không thể xoá tài khoản đang đăng nhập');
    await execute(`UPDATE "User" SET "Visible" = 0 WHERE "UserID" = @userID`, { userID });
    return success(res, null, 'Đã xoá người dùng');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const changePassword = async (req, res) => {
  try {
    const { password, newPassword, createBy } = req.body;
    const userID = req.params.id;
    if (!password || !newPassword) return badRequest(res, 'Vui lòng nhập mật khẩu cũ và mật khẩu mới');
    const user = await queryOne(`SELECT "Password" FROM "User" WHERE "UserID" = @userID`, { userID });
    if (!user) return notFound(res, 'Không tìm thấy người dùng');
    const { valid } = await verifyPassword(password, user.Password);
    if (!valid) return badRequest(res, 'Mật khẩu cũ không đúng');
    const newHashed = await hashPassword(newPassword);
    await execute(
      `UPDATE "User" SET "Password" = @newPassword, "CreateBy" = @createBy WHERE "UserID" = @userID`,
      { newPassword: newHashed, createBy: createBy || userID, userID }
    );
    return success(res, null, 'Đổi mật khẩu thành công');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

module.exports = { getAllUsers, getAllUsersAdmin, getUserById, getUsersByFaculty, addUser, updateUser, deleteUser, changePassword };

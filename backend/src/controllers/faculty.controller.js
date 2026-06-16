const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

const getListFaculty = async (req, res) => {
  try {
    const faculties = await query(
      `SELECT "FacultyID","FacultyName","Avatar","Desc","Visible","CreateBy" FROM Faculty
       WHERE "Visible" = 1 ORDER BY "FacultyName"`
    );
    return success(res, faculties);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getAllFaculty = async (req, res) => {
  try {
    const faculties = await query(
      `SELECT "FacultyID","FacultyName","Avatar","Desc","Visible","CreateBy" FROM Faculty ORDER BY "FacultyName"`
    );
    return success(res, faculties);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getDetailFaculty = async (req, res) => {
  try {
    const faculty = await queryOne(
      `SELECT "FacultyID","FacultyName","Avatar","Desc","Visible","CreateBy" FROM Faculty WHERE "FacultyID" = @facultyID`,
      { facultyID: parseInt(req.params.id) }
    );
    if (!faculty) return notFound(res, 'Không tìm thấy khoa');
    return success(res, faculty);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const addFaculty = async (req, res) => {
  try {
    const { facultyName, avatar, desc, visible, createBy } = req.body;
    if (!facultyName) return badRequest(res, 'Thiếu tên khoa');
    const result = await execute(
      `INSERT INTO Faculty ("FacultyName","Avatar","Desc","Visible","CreateBy","CreateDate")
       VALUES (@facultyName, @avatar, @desc, @visible, @createBy, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
      {
        facultyName, avatar: avatar || '/uploads/images/nopic.png',
        desc: desc || '', visible: visible !== false ? 1 : 0,
        createBy: createBy || req.user?.userID || 'admin',
      }
    );
    return success(res, { facultyID: result.lastInsertRowid }, 'Thêm khoa thành công', 201);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const updateFaculty = async (req, res) => {
  try {
    const { facultyName, avatar, desc, visible, createBy } = req.body;
    await execute(
      `UPDATE Faculty SET "FacultyName"=@facultyName, "Avatar"=@avatar, "Desc"=@desc, "Visible"=@visible, "CreateBy"=@createBy
       WHERE "FacultyID"=@facultyID`,
      {
        facultyName, avatar: avatar || '/uploads/images/nopic.png',
        desc: desc || '', visible: visible !== false ? 1 : 0,
        createBy: createBy || req.user?.userID,
        facultyID: parseInt(req.params.id),
      }
    );
    return success(res, null, 'Cập nhật khoa thành công');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const deleteFaculty = async (req, res) => {
  try {
    await execute(`UPDATE Faculty SET "Visible"=0 WHERE "FacultyID"=@facultyID`, { facultyID: parseInt(req.params.id) });
    return success(res, null, 'Đã xoá khoa');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

module.exports = { getListFaculty, getAllFaculty, getDetailFaculty, addFaculty, updateFaculty, deleteFaculty };

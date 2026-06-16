const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

const getListArea = async (req, res) => {
  try {
    const areas = await query(
      `SELECT "AreaID","AreaName","Avatar","Desc","Visible","CreateBy" FROM Area
       WHERE "Visible" = 1 ORDER BY "AreaName"`
    );
    return success(res, areas);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getAllArea = async (req, res) => {
  try {
    const areas = await query(
      `SELECT "AreaID","AreaName","Avatar","Desc","Visible","CreateBy" FROM Area ORDER BY "AreaName"`
    );
    return success(res, areas);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getDetailArea = async (req, res) => {
  try {
    const area = await queryOne(
      `SELECT "AreaID","AreaName","Avatar","Desc","Visible","CreateBy" FROM Area WHERE "AreaID" = @areaID`,
      { areaID: parseInt(req.params.id) }
    );
    if (!area) return notFound(res, 'Không tìm thấy khu vực');
    return success(res, area);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const addArea = async (req, res) => {
  try {
    const { areaName, avatar, desc, visible, createBy } = req.body;
    if (!areaName) return badRequest(res, 'Thiếu tên khu vực');
    const result = await execute(
      `INSERT INTO Area ("AreaName","Avatar","Desc","Visible","CreateBy","CreateDate")
       VALUES (@areaName, @avatar, @desc, @visible, @createBy, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
      {
        areaName, avatar: avatar || '/uploads/images/nopic.png',
        desc: desc || '', visible: visible !== false ? 1 : 0,
        createBy: createBy || req.user?.userID || 'admin',
      }
    );
    return success(res, { areaID: result.lastInsertRowid }, 'Thêm khu vực thành công', 201);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const updateArea = async (req, res) => {
  try {
    const { areaName, avatar, desc, visible, createBy } = req.body;
    await execute(
      `UPDATE Area SET "AreaName"=@areaName, "Avatar"=@avatar, "Desc"=@desc, "Visible"=@visible, "CreateBy"=@createBy
       WHERE "AreaID"=@areaID`,
      {
        areaName, avatar: avatar || '/uploads/images/nopic.png',
        desc: desc || '', visible: visible !== false ? 1 : 0,
        createBy: createBy || req.user?.userID,
        areaID: parseInt(req.params.id),
      }
    );
    return success(res, null, 'Cập nhật khu vực thành công');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const deleteArea = async (req, res) => {
  try {
    await execute(`UPDATE Area SET "Visible"=0 WHERE "AreaID"=@areaID`, { areaID: parseInt(req.params.id) });
    return success(res, null, 'Đã xoá khu vực');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

module.exports = { getListArea, getAllArea, getDetailArea, addArea, updateArea, deleteArea };

const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { roomID, search } = req.query;
    let sql = `
      SELECT e."EquipmentID", e."RoomID", e."Name", e."Icon", e."Quantity", e."Note",
             r."RoomName", a."AreaName"
      FROM Equipment e
      LEFT JOIN Room r ON e."RoomID" = r."RoomID"
      LEFT JOIN Area a ON r."AreaID" = a."AreaID"
      WHERE e."Visible" = 1
    `;
    const params = {};
    if (roomID) { sql += ` AND e."RoomID" = @roomID`; params.roomID = parseInt(roomID); }
    if (search)  { sql += ` AND e."Name" LIKE '%' || @search || '%'`; params.search = search; }
    sql += ` ORDER BY r."RoomName", e."Name"`;
    const items = await query(sql, params);
    return success(res, items);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const getByRoom = async (req, res) => {
  try {
    const items = await query(
      `SELECT "EquipmentID","RoomID","Name","Icon","Quantity","Note"
       FROM Equipment
       WHERE "RoomID" = @roomID AND "Visible" = 1
       ORDER BY "Name"`,
      { roomID: parseInt(req.params.roomId) }
    );
    return success(res, items);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const addEquipment = async (req, res) => {
  try {
    const { roomID, name, icon, quantity, note } = req.body;
    if (!roomID || !name) return badRequest(res, 'Thiếu phòng hoặc tên thiết bị');
    const result = await execute(
      `INSERT INTO Equipment ("RoomID","Name","Icon","Quantity","Note","Visible")
       VALUES (@roomID, @name, @icon, @quantity, @note, 1)`,
      { roomID: parseInt(roomID), name, icon: icon || 'fa-cube', quantity: parseInt(quantity) || 1, note: note || '' }
    );
    return success(res, { equipmentID: result.lastInsertRowid }, 'Đã thêm thiết bị', 201);
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const updateEquipment = async (req, res) => {
  try {
    const { name, icon, quantity, note } = req.body;
    const equipmentID = parseInt(req.params.id);
    const item = await queryOne(`SELECT "EquipmentID" FROM Equipment WHERE "EquipmentID" = @equipmentID`, { equipmentID });
    if (!item) return notFound(res, 'Không tìm thấy thiết bị');
    await execute(
      `UPDATE Equipment SET "Name"=@name, "Icon"=@icon, "Quantity"=@quantity, "Note"=@note WHERE "EquipmentID"=@equipmentID`,
      { name, icon: icon || 'fa-cube', quantity: parseInt(quantity) || 1, note: note || '', equipmentID }
    );
    return success(res, null, 'Cập nhật thiết bị thành công');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

const deleteEquipment = async (req, res) => {
  try {
    await execute(`UPDATE Equipment SET "Visible"=0 WHERE "EquipmentID"=@equipmentID`, { equipmentID: parseInt(req.params.id) });
    return success(res, null, 'Đã xoá thiết bị');
  } catch (err) { return error(res, 'Lỗi hệ thống', 500, err.message); }
};

module.exports = { getAll, getByRoom, addEquipment, updateEquipment, deleteEquipment };

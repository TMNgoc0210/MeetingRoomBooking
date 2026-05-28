const jwt = require('jsonwebtoken');
const { query, queryOne, execute } = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/hashPassword');
const { success, error, unauthorized, badRequest } = require('../utils/response');

const logLogin = (username, ip, status, reason = '') => {
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  execute(
    `INSERT INTO LoginLog (Username, IP, Status, Reason, CreatedAt)
     VALUES (@username, @ip, @status, @reason, @createdAt)`,
    { username, ip: ip || '', status, reason, createdAt }
  ).catch(() => {});
};

/**
 * Tạo access token (15 phút)
 */
const signAccessToken = (user) => {
  return jwt.sign(
    {
      userID: user.UserID,
      fullName: user.FullName,
      roles: user.Roles,
      avatar: user.Avatar,
      facultyID: user.FacultyID,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Tạo refresh token (7 ngày)
 */
const signRefreshToken = (userID) => {
  return jwt.sign({ userID }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return badRequest(res, 'Vui lòng nhập tên đăng nhập và mật khẩu');
    }

    // Lấy user từ DB
    const users = await query(
      `SELECT u.*, f.FacultyName FROM [User] u
       LEFT JOIN Faculty f ON u.FacultyID = f.FacultyID
       WHERE u.UserID = @username AND u.Visible = 1`,
      { username }
    );

    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    const user = users[0];
    if (!user) {
      logLogin(username, ip, 'failed', 'Tài khoản không tồn tại');
      return unauthorized(res, 'Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // Verify password (hỗ trợ SHA256 cũ và bcrypt mới)
    const { valid, needsUpgrade } = await verifyPassword(password, user.Password);
    if (!valid) {
      logLogin(username, ip, 'failed', 'Sai mật khẩu');
      return unauthorized(res, 'Mật khẩu không đúng');
    }

    // Lazy migration: upgrade SHA256 → bcrypt
    if (needsUpgrade) {
      const newHash = await hashPassword(password);
      await execute(`UPDATE [User] SET Password = @newHash WHERE UserID = @userID`, {
        newHash,
        userID: user.UserID,
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.UserID);

    // Gửi refresh token qua httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // Trả về thông tin user và access token (giống cấu trúc cũ để React dùng được)
    logLogin(username, ip, 'success', '');
    return success(res, {
      accessToken,
      user: {
        UserID: user.UserID,
        FullName: user.FullName,
        Avatar: user.Avatar || '/uploads/images/nopic.png',
        Roles: user.Roles,
        FacultyID: user.FacultyID,
        FacultyName: user.FacultyName,
        Email: user.Email,
        Mobi: user.Mobi,
      },
    }, 'Đăng nhập thành công');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('refreshToken');
  return success(res, null, 'Đăng xuất thành công');
};

/**
 * GET /api/auth/me — lấy thông tin user đang đăng nhập
 */
const getMe = async (req, res) => {
  try {
    const users = await query(
      `SELECT u.UserID, u.FullName, u.Avatar, u.Roles, u.FacultyID, u.Email, u.Mobi, u.Visible,
              f.FacultyName
       FROM [User] u
       LEFT JOIN Faculty f ON u.FacultyID = f.FacultyID
       WHERE u.UserID = @userID`,
      { userID: req.user.userID }
    );
    const user = users[0];
    if (!user) return error(res, 'Không tìm thấy người dùng', 404);
    return success(res, user);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * POST /api/auth/refresh — làm mới access token bằng refresh token
 * Luôn lấy roles mới nhất từ DB để tránh JWT cũ chứa roles sai
 */
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return unauthorized(res, 'Không có refresh token');

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await queryOne(
      `SELECT UserID, FullName, Avatar, Roles, FacultyID FROM "User" WHERE UserID = @userID AND Visible = 1`,
      { userID: decoded.userID }
    );
    if (!user) {
      res.clearCookie('refreshToken');
      return unauthorized(res, 'Tài khoản không tồn tại hoặc đã bị khóa');
    }

    const newAccessToken = signAccessToken(user);
    return success(res, { accessToken: newAccessToken }, 'Làm mới token thành công');
  } catch {
    res.clearCookie('refreshToken');
    return unauthorized(res, 'Refresh token không hợp lệ hoặc đã hết hạn');
  }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, fullName, email, mobi, password, confirmPassword, facultyID } = req.body;

    if (!username?.trim()) return badRequest(res, 'Vui lòng nhập tên đăng nhập');
    if (!fullName?.trim()) return badRequest(res, 'Vui lòng nhập họ và tên');
    if (!password) return badRequest(res, 'Vui lòng nhập mật khẩu');
    if (password.length < 6) return badRequest(res, 'Mật khẩu phải có ít nhất 6 ký tự');
    if (password !== confirmPassword) return badRequest(res, 'Mật khẩu xác nhận không khớp');
    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim()))
      return badRequest(res, 'Tên đăng nhập chỉ được dùng chữ, số, dấu chấm, gạch dưới');

    const existing = await queryOne(
      `SELECT UserID FROM "User" WHERE UserID = @username`,
      { username: username.trim() }
    );
    if (existing) return badRequest(res, 'Tên đăng nhập đã được sử dụng');

    const hashed = await hashPassword(password);
    await execute(
      `INSERT INTO "User" (UserID, FullName, Password, Email, Mobi, FacultyID, Roles, Visible, CreateBy)
       VALUES (@username, @fullName, @hashed, @email, @mobi, @facultyID, 0, 1, 'self-register')`,
      {
        username: username.trim(),
        fullName: fullName.trim(),
        hashed,
        email: email?.trim() || '',
        mobi: mobi?.trim() || '',
        facultyID: facultyID ? parseInt(facultyID) : null,
      }
    );

    return success(res, null, 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
  } catch (err) {
    console.error('Register error:', err);
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { login, logout, getMe, refreshToken, register };

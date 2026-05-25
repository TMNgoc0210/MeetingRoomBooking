using MeetingBooking.Models;
using Model.EF;
using Model.ViewModels;
using Models.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.DAO
{
    public class UserDao
    {
        DBContext db = null;

        public UserDao()
        {
            db = new DBContext();
        }

        public UserSession Login(string username, string password)
        {
           // string hassPass = password.SHA256Hash();
                var data = db.Users.Join(db.Faculties, x => x.FacultyID, y => y.FacultyID, (x, y) => new UserSession
                {
                    UserID      = x.UserID,
                    Password    = x.Password,
                    Permission  = x.Permission,
                    FullName    = x.FullName,
                    Mobi        = x.Mobi,
                    Avatar      = x.Avatar,
                    Email       = x.Email,
                    CreateTime  = x.CreateTime,
                    CreateBy    = x.CreateBy,
                    Visible     = x.Visible,
                    Roles       = x.Roles,
                    FacutlyID   = x.FacultyID,
                    FacutlyName = y.FacultyName

                }).FirstOrDefault(x => x.UserID == username && x.Visible == true && x.Password == password);

            if (data != null)
            {
                return data;
            }
            return null;
        }

        public object ListUser(string fullName, int? facultyID)
        {
            IEnumerable<ListUserModel> data;

            if (fullName != string.Empty)
            {
                if (facultyID != 0)
                {

                    data = from a in db.Users
                           where a.Visible == true
                           && a.FullName.Contains(fullName)
                           && a.FacultyID == facultyID
                           select new ListUserModel
                           {
                               userID = a.UserID,
                               fullName = a.FullName,
                               userAvatar = a.Avatar,
                               mobi = a.Mobi,
                               email = a.Email,
                               password = a.Password,
                               createBy = a.CreateBy,
                               createTime = a.CreateTime,
                               visible = a.Visible,
                               roles = a.Roles,
                           };


                }
                else
                {
                    data = from a in db.Users
                           where a.Visible == true
                           && a.FullName.Contains(fullName)
                           select new ListUserModel
                           {
                               userID = a.UserID,
                               fullName = a.FullName,
                               userAvatar = a.Avatar,
                               mobi = a.Mobi,
                               email = a.Email,
                               password = a.Password,
                               createBy = a.CreateBy,
                               createTime = a.CreateTime,
                               visible = a.Visible,
                               roles = a.Roles,
                           };
                }
            }
            else if (facultyID != 0)
            {
                data = from a in db.Users
                       where a.Visible == true
                       && a.FacultyID == facultyID
                       select new ListUserModel
                       {
                           userID = a.UserID,
                           fullName = a.FullName,
                           userAvatar = a.Avatar,
                           mobi = a.Mobi,
                           email = a.Email,
                           password = a.Password,
                           createBy = a.CreateBy,
                           createTime = a.CreateTime,
                           visible = a.Visible,
                           roles = a.Roles,
                       };
            }
            else
            {
                data = from a in db.Users
                       where a.Visible == true
                       select new ListUserModel
                       {
                           userID = a.UserID,
                           fullName = a.FullName,
                           userAvatar = a.Avatar,
                           mobi = a.Mobi,
                           email = a.Email,
                           password = a.Password,
                           createBy = a.CreateBy,
                           createTime = a.CreateTime,
                           visible = a.Visible,
                           roles = a.Roles,
                       };
            }

            var result = data.ToList();

            return result;
        }

        public object ListAllUser(string fullName, int? facultyID)
        {
            IEnumerable<ListUserModel> data;
            if (fullName != string.Empty)
            {
                if (facultyID != 0)
                {

                    data = from a in db.Users
                           where a.FullName.Contains(fullName)
                           && a.FacultyID == facultyID
                           select new ListUserModel
                           {
                               userID = a.UserID,
                               fullName = a.FullName,
                               userAvatar = a.Avatar,
                               mobi = a.Mobi,
                               email = a.Email,
                               password = a.Password,
                               createBy = a.CreateBy,
                               createTime = a.CreateTime,
                               visible = a.Visible,
                               roles = a.Roles,

                           };


                }
                else
                {
                    data = from a in db.Users
                           where a.FullName.Contains(fullName)
                           select new ListUserModel
                           {
                               userID = a.UserID,
                               fullName = a.FullName,
                               userAvatar = a.Avatar,
                               mobi = a.Mobi,
                               email = a.Email,
                               password = a.Password,
                               createBy = a.CreateBy,
                               createTime = a.CreateTime,
                               visible = a.Visible,
                               roles = a.Roles,
                           };
                }
            }
            else if (facultyID != 0)
            {
                data = from a in db.Users
                       where a.FacultyID == facultyID
                       select new ListUserModel
                       {
                           userID = a.UserID,
                           fullName = a.FullName,
                           userAvatar = a.Avatar,
                           mobi = a.Mobi,
                           email = a.Email,
                           password = a.Password,
                           createBy = a.CreateBy,
                           createTime = a.CreateTime,
                           visible = a.Visible,
                           roles = a.Roles,
                       };
            }
            else
            {
                data = from a in db.Users
                       select new ListUserModel
                       {
                           userID = a.UserID,
                           fullName = a.FullName,
                           userAvatar = a.Avatar,
                           email = a.Email,
                           mobi = a.Mobi,
                           password = a.Password,
                           createBy = a.CreateBy,
                           createTime = a.CreateTime,
                           visible = a.Visible,
                           roles = a.Roles,
                       };
            }

            var result = data.ToList();

            return result;
        }

        public object GetAllUser()
        {
            return db.Users.Where(x => x.Visible == true).ToList();
        }

        public object GetDetailUser(string userID)
        {
            return db.Users.Select(x => new
            {
                UserID          = x.UserID,
                Avatar          = x.Avatar,
                FullName        = x.FullName,
                Mobi            = x.Mobi,
                Email           = x.Email,
                Password        = x.Password,
                Visible         = x.Visible,
                Roles           = x.Roles,
                Position        = x.Position,
                FacultyID       = x.FacultyID,
                UpdateBy        = x.UpdateBy,
                UpdateTime      = x.UpdateTime,
                CreateBy        = x.CreateBy,
                CreateTime      = x.CreateTime,
                FacultyName     = db.Faculties.FirstOrDefault(z => z.FacultyID == x.FacultyID).FacultyName
            }).FirstOrDefault(x => x.UserID == userID);
        }

        public object GetFacultyByUser(int? facultyID)
        {
            return db.Faculties.Where(x => x.FacultyID == facultyID).Select(x => x.FacultyName).ToList();
        }

        public object AddUser(string userID, string fullName, int facultyID, string mobi, string email, bool? visible, bool? roles, string password, string avatar, string createBy)
        {
            var checkUserID = db.Users.Where(x => x.UserID == userID).FirstOrDefault();
            if (checkUserID != null)
            {
                return new
                {
                    status = 2
                };
            }
            User user = new User();
            string hassPass = password.SHA256Hash();
            user.UserID = userID;
            user.FullName = fullName;
            user.FacultyID = facultyID;
            user.Email = email;
            user.Mobi = mobi;
            user.Password = hassPass;
            user.Visible = visible;
            user.Roles = roles;
            user.Avatar = avatar;
            user.CreateBy = createBy;
            db.Users.Add(user);
            try
            {
                db.SaveChanges();
                return new
                {
                    status = 1,
                };
            }
            catch (Exception)
            {
                return new
                {
                    status = 0,
                };
            }

        }

        public object UpdateUserDetail(string userID, string fullName, int facultyID, string mobi, string email, bool? visible, bool? roles, string avatar, string createBy)
        {
            var user       = db.Users.Where(x => x.UserID == userID).FirstOrDefault();
            user.FullName  = fullName;
            user.FacultyID = facultyID;
            user.Email     = email;
            user.Mobi      = mobi;
            user.Visible   = visible;
            user.Roles     = roles;
            user.Avatar    = avatar;
            user.UpdateBy  = createBy;

            try
            {
                db.SaveChanges();
                return new
                {
                    status = 1,
                };
            }
            catch (Exception)
            {
                return new
                {
                    status = 0,
                };
            }
        }

        public object ChangePass(string userID, string password, string newPassword, string createBy)
        {
            var user = db.Users.Where(x => x.UserID == userID).FirstOrDefault();
            if (user == null)
            {
                return new
                {
                    status = 2
                };
            }
            string checkPass = password.SHA256Hash();
            if (checkPass != user.Password)
            {
                return new
                {
                    status = 3
                };
            }
            string hassPass = newPassword.SHA256Hash();
            user.UpdateBy = createBy;
            user.Password = hassPass;
            user.CreateTime = DateTime.Now;
            try
            {
                db.SaveChanges();
                return new
                {
                    status = 1,
                };
            }
            catch (Exception)
            {
                return new
                {
                    status = 0,
                };
            }

        }

        public object DeleteUser(string userID)
        {
            var itemUser = db.Users.Where(x => x.UserID == userID).FirstOrDefault();
            db.Users.Remove(itemUser);
            try
            {
                db.SaveChanges();
                return new
                {
                    status = 1
                };
            }
            catch (Exception)
            {
                return new
                {
                    status = 0
                };
            }
        }

    }
}

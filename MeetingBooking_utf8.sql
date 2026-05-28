USE [MeetingRoomBooking]
GO
/****** Object:  Table [dbo].[Area]    Script Date: 11/4/2020 8:32:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Area](
	[AreaID] [int] IDENTITY(1,1) NOT NULL,
	[AreaName] [nvarchar](255) NOT NULL,
	[Avatar] [nvarchar](255) NULL,
	[Description] [nvarchar](255) NULL,
	[CreateTime] [datetime] NULL,
	[UpdateTime] [datetime] NULL,
	[Position] [int] NULL,
	[CreateBy] [nvarchar](50) NULL,
	[UpdateBy] [nvarchar](50) NULL,
	[Visible] [bit] NULL,
 CONSTRAINT [PK_Area_1] PRIMARY KEY CLUSTERED 
(
	[AreaID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Faculty]    Script Date: 11/4/2020 8:32:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Faculty](
	[FacultyID] [int] IDENTITY(1,1) NOT NULL,
	[FacultyName] [nvarchar](255) NULL,
	[Avatar] [nvarchar](255) NULL,
	[Description] [nvarchar](255) NULL,
	[Position] [int] NULL,
	[Visible] [bit] NULL,
	[CreateTime] [datetime] NULL,
	[UpdateTime] [datetime] NULL,
	[CreateBy] [nvarchar](50) NULL,
	[UpdateBy] [nvarchar](50) NULL,
 CONSTRAINT [PK_Faculty] PRIMARY KEY CLUSTERED 
(
	[FacultyID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LineRoom]    Script Date: 11/4/2020 8:32:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LineRoom](
	[LineRoomID] [int] IDENTITY(1,1) NOT NULL,
	[LineRoomName] [nvarchar](255) NULL,
	[Content] [nvarchar](255) NULL,
	[Description] [nvarchar](255) NULL,
	[Status] [int] NULL,
	[TimeStart] [datetime] NULL,
	[TimeEnd] [datetime] NULL,
	[CreateBy] [nvarchar](50) NULL,
	[CreateTime] [datetime] NULL,
	[UpdateBy] [nvarchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[NumberPerson] [int] NULL,
	[Posititon] [int] NULL,
	[RoomID] [int] NULL,
 CONSTRAINT [PK_LineRoom] PRIMARY KEY CLUSTERED 
(
	[LineRoomID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Room]    Script Date: 11/4/2020 8:32:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Room](
	[RoomID] [int] IDENTITY(1,1) NOT NULL,
	[RoomName] [nvarchar](50) NULL,
	[Avatar] [nvarchar](255) NULL,
	[Description] [nvarchar](255) NULL,
	[Seat] [int] NULL,
	[PhoneCall] [bit] NULL,
	[VideoCall] [bit] NULL,
	[Position] [int] NULL,
	[AreaID] [int] NULL,
	[UpdateBy] [nvarchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[CreateBy] [nvarchar](50) NULL,
	[CreateTime] [datetime] NULL,
	[NumberPeople] [int] NULL,
	[Visible] [bit] NULL,
 CONSTRAINT [PK_Room] PRIMARY KEY CLUSTERED 
(
	[RoomID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[User]    Script Date: 11/4/2020 8:32:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[User](
	[UserID] [nvarchar](50) NOT NULL,
	[Password] [nvarchar](255) NULL,
	[Visible] [bit] NULL,
	[Permission] [int] NULL,
	[Position] [int] NULL,
	[CreateBy] [nvarchar](50) NULL,
	[CreateTime] [datetime] NULL,
	[FullName] [nvarchar](255) NULL,
	[Mobi] [nvarchar](50) NULL,
	[Avatar] [nvarchar](255) NULL,
	[Email] [nvarchar](255) NULL,
	[FacultyID] [int] NULL,
	[Roles] [bit] NULL,
	[UpdateTime] [datetime] NULL,
	[UpdateBy] [nvarchar](50) NULL,
 CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED 
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[Area] ON 

INSERT [dbo].[Area] ([AreaID], [AreaName], [Avatar], [Description], [CreateTime], [UpdateTime], [Position], [CreateBy], [UpdateBy], [Visible]) VALUES (1, N'Cơ Sở 1-DKB', N'/Uploads/Images/114202074626PM.jpg', N'Cơ sở 1: Thủ đô Hà Nội', NULL, CAST(N'2020-11-04T20:00:15.423' AS DateTime), NULL, NULL, N'Admin', 1)
INSERT [dbo].[Area] ([AreaID], [AreaName], [Avatar], [Description], [CreateTime], [UpdateTime], [Position], [CreateBy], [UpdateBy], [Visible]) VALUES (2, N'Cơ Sở 2-DKB', N'/Uploads/Images/114202074643PM.png', N'Cơ sở 2: Thành Phố Hồ Chí Minh', NULL, CAST(N'2020-11-04T20:00:03.730' AS DateTime), NULL, NULL, N'Admin', 1)
SET IDENTITY_INSERT [dbo].[Area] OFF
SET IDENTITY_INSERT [dbo].[Faculty] ON 

INSERT [dbo].[Faculty] ([FacultyID], [FacultyName], [Avatar], [Description], [Position], [Visible], [CreateTime], [UpdateTime], [CreateBy], [UpdateBy]) VALUES (1, N'Khoa Đại Cương', N'/Uploads/Images/114202074722PM.png', N'Khoa đại cương ', NULL, 1, NULL, CAST(N'2020-11-04T19:47:24.033' AS DateTime), NULL, N'Admin')
INSERT [dbo].[Faculty] ([FacultyID], [FacultyName], [Avatar], [Description], [Position], [Visible], [CreateTime], [UpdateTime], [CreateBy], [UpdateBy]) VALUES (3, N'Khoa Tài Chính-Ngân Hàng', N'/Uploads/Images/114202074816PM.jpg', N'Khoa Tài Chính-Ngân Hàng ', NULL, 1, NULL, CAST(N'2020-11-04T19:48:35.187' AS DateTime), NULL, N'Admin')
INSERT [dbo].[Faculty] ([FacultyID], [FacultyName], [Avatar], [Description], [Position], [Visible], [CreateTime], [UpdateTime], [CreateBy], [UpdateBy]) VALUES (4, N'Khoa Kỹ thuật-Công Nghệ', N'/Uploads/Images/114202074738PM.jpg', N'Khoa Kỹ thuật-công nghệ ', NULL, 1, NULL, CAST(N'2020-11-04T19:47:40.180' AS DateTime), NULL, N'Admin')
INSERT [dbo].[Faculty] ([FacultyID], [FacultyName], [Avatar], [Description], [Position], [Visible], [CreateTime], [UpdateTime], [CreateBy], [UpdateBy]) VALUES (5, N'Khoa Quản Trị', N'/Uploads/Images/7142019124616PM.jpg', N'Khoa quản trị', NULL, 1, NULL, CAST(N'2020-11-04T19:48:44.523' AS DateTime), NULL, N'Admin')
INSERT [dbo].[Faculty] ([FacultyID], [FacultyName], [Avatar], [Description], [Position], [Visible], [CreateTime], [UpdateTime], [CreateBy], [UpdateBy]) VALUES (6, N'Khoa Dược', N'/Uploads/Images/7142019124623PM.jpg', N'Khoa dược ', NULL, 1, CAST(N'2019-07-14T11:24:30.107' AS DateTime), CAST(N'2020-11-04T19:48:28.107' AS DateTime), N'Nguyễn Ngọc Sơn', N'Admin')
SET IDENTITY_INSERT [dbo].[Faculty] OFF
SET IDENTITY_INSERT [dbo].[LineRoom] ON 

INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (72, N' Họp  giao ban của Ban giám hiệu', NULL, NULL, 1, CAST(N'2019-07-15T13:30:00.000' AS DateTime), CAST(N'2019-07-15T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-07-14T12:32:24.300' AS DateTime), NULL, NULL, 5, NULL, 1)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (74, N'Họp sơ kết', NULL, NULL, 1, CAST(N'2019-07-01T13:30:00.000' AS DateTime), CAST(N'2019-07-01T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-07-01T12:32:24.300' AS DateTime), NULL, NULL, 5, NULL, 2)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (75, N'Tổng kết, tập huấn', NULL, NULL, 1, CAST(N'2019-07-06T13:30:00.000' AS DateTime), CAST(N'2019-07-06T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-07-06T12:32:24.300' AS DateTime), NULL, NULL, 5, NULL, 3)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (76, N'Triển khai, họp hội đồng', NULL, NULL, 1, CAST(N'2019-07-07T13:30:00.000' AS DateTime), CAST(N'2019-07-07T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-07-06T12:32:24.300' AS DateTime), NULL, NULL, 5, NULL, 3)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (77, N'
Quyết định về việc ban hành Quy chế xét nâng bậc lương trước thời hạn', NULL, NULL, 1, CAST(N'2019-01-01T13:30:00.000' AS DateTime), CAST(N'2019-01-01T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-01-01T12:32:24.300' AS DateTime), NULL, NULL, 5, NULL, 4)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (79, N'Quyết định Ban hành Quy chế đánh giá kết quả rèn luyện của học sinh, sinh viên', NULL, NULL, 1, CAST(N'2019-01-13T13:30:00.000' AS DateTime), CAST(N'2019-01-13T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-01-13T15:30:00.000' AS DateTime), NULL, NULL, 5, NULL, 5)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (80, N'Ban hành Quy định về công tác giáo viên chủ nhiệm ', NULL, NULL, 1, CAST(N'2019-02-13T13:30:00.000' AS DateTime), CAST(N'2019-02-13T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-02-13T15:30:00.000' AS DateTime), NULL, NULL, 5, NULL, 6)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (81, N'Quyết định Ban hành Quy chế đánh giá kết quả rèn luyện của học sinh, sinh viên', NULL, NULL, 1, CAST(N'2019-02-13T13:30:00.000' AS DateTime), CAST(N'2019-02-13T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-02-13T15:30:00.000' AS DateTime), NULL, NULL, 5, NULL, 6)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (82, N'Quy định về quản lý đề tài khoa học và công nghệ cấp trường', NULL, NULL, 1, CAST(N'2019-03-12T13:30:00.000' AS DateTime), CAST(N'2019-03-12T15:30:00.000' AS DateTime), N'sonit', CAST(N'2019-03-12T13:30:00.000' AS DateTime), NULL, NULL, 5, NULL, 7)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (84, N'Kế hoạch tổng kết năm học 2018-2019', N'', N'', 1, CAST(N'2019-07-14T15:30:00.000' AS DateTime), CAST(N'2019-07-14T16:00:00.000' AS DateTime), N'admin', CAST(N'2019-07-14T14:23:03.513' AS DateTime), NULL, NULL, 12, NULL, 1)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (85, N'Kế hoạch báo cáo tốt nghiệp khoa KTCN khối D15', N'', N'', 1, CAST(N'2019-07-14T16:30:00.000' AS DateTime), CAST(N'2019-07-14T17:30:00.000' AS DateTime), N'admin', CAST(N'2019-07-14T14:24:28.237' AS DateTime), N'admin', CAST(N'2019-07-14T14:24:48.373' AS DateTime), 10, NULL, 20)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (86, N'Tổng kết năm học 2018-2019', N'', N'Chuẩn bị thêm mic', 1, CAST(N'2019-07-15T19:30:00.000' AS DateTime), CAST(N'2019-07-15T20:30:00.000' AS DateTime), N'admin', CAST(N'2019-07-15T19:27:28.467' AS DateTime), N'admin', CAST(N'2019-07-15T19:28:00.600' AS DateTime), 5, NULL, 1)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (87, N'Họp giao ban', N'Họp giao ban', N'', 1, CAST(N'2020-11-04T20:22:00.000' AS DateTime), CAST(N'2020-11-04T21:22:00.000' AS DateTime), N'admin', CAST(N'2020-11-03T21:24:58.393' AS DateTime), NULL, NULL, 20, NULL, 1)
INSERT [dbo].[LineRoom] ([LineRoomID], [LineRoomName], [Content], [Description], [Status], [TimeStart], [TimeEnd], [CreateBy], [CreateTime], [UpdateBy], [UpdateTime], [NumberPerson], [Posititon], [RoomID]) VALUES (88, N'Họp giao ban', N'', N'', 1, CAST(N'2020-11-03T22:25:00.000' AS DateTime), CAST(N'2020-11-03T23:25:00.000' AS DateTime), N'admin', CAST(N'2020-11-03T21:26:11.810' AS DateTime), NULL, NULL, 10, NULL, 1)
SET IDENTITY_INSERT [dbo].[LineRoom] OFF
SET IDENTITY_INSERT [dbo].[Room] ON 

INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (1, N'Phòng K101', N'/Uploads/Images/7142019104445AM.jpg', N'', 50, 1, 0, NULL, 1, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (2, N'Phòng K104', N'/Uploads/Images/7142019104641AM.jpg', N'', 25, 1, 1, NULL, 1, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (3, N'Phòng K105', N'/Uploads/Images/7142019105238AM.jpg', N'', 10, 1, 1, NULL, 1, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (4, N'Phòng K102', N'/Uploads/Images/7142019104510AM.jpg', N'', 22, 0, 0, NULL, 1, N'Nguyễn Ngọc Sơn', CAST(N'2019-05-13T22:21:07.493' AS DateTime), NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (5, N'Phòng K201', N'/Uploads/Images/7142019104804AM.jpg', N'', 5, 1, 1, NULL, 2, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (8, N'Phòng K203', N'/Uploads/Images/7142019105415AM.jpg', N'', 30, 0, 0, NULL, 2, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (9, N'Phòng K103', N'/Uploads/Images/7142019104528AM.jpg', N'', 20, 1, 1, NULL, 1, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (20, N'Phòng K202', N'/Uploads/Images/7142019104911AM.jpg', N'', 123, 1, 1, NULL, 2, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
INSERT [dbo].[Room] ([RoomID], [RoomName], [Avatar], [Description], [Seat], [PhoneCall], [VideoCall], [Position], [AreaID], [UpdateBy], [UpdateTime], [CreateBy], [CreateTime], [NumberPeople], [Visible]) VALUES (21, N'Phòng K204', N'/Uploads/Images/7142019105452AM.jpg', N'', 23, 1, 1, NULL, 2, N'Nguyễn Ngọc Sơn', NULL, NULL, NULL, NULL, 1)
SET IDENTITY_INSERT [dbo].[Room] OFF
INSERT [dbo].[User] ([UserID], [Password], [Visible], [Permission], [Position], [CreateBy], [CreateTime], [FullName], [Mobi], [Avatar], [Email], [FacultyID], [Roles], [UpdateTime], [UpdateBy]) VALUES (N'admin', N'admin', 1, NULL, NULL, NULL, NULL, N'Admin', N'', N'/Content/Images/nopic.png', N'admin@gmail.com', 5, 1, NULL, N'Admin')

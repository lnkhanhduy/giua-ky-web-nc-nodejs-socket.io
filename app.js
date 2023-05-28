require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { check, validationResult } = require("express-validator");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();

const port = process.env.PORT || 8080;

const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("lnkd"));
app.use(flash());
app.use(
  session({
    secret: "lnkd",
    resave: false,
    saveUninitialized: false,
  })
);

const loginValidator = [
  check("name").notEmpty().withMessage("Vui lòng nhập tên của bạn"),
];

app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const user = req.session.user;
  res.render("index", { user });
});

app.get("/login", (req, res) => {
  let error = req.flash("error");
  res.render("login", { error });
});

app.post("/login", loginValidator, (req, res) => {
  const result = validationResult(req);

  if (result.errors.length > 0) {
    req.flash("error", result.errors[0].msg);
    res.redirect("/login");
  } else {
    const name = req.body;
    req.session.user = name;
    return res.redirect("/");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

let numUsers = 0;
//tạo kết nối giữa client và server
io.on("connection", (socket) => {
  let addUser = false;

  //thêm người dùng
  socket.on("user-login", (name) => {
    if (addUser) {
      return;
    }

    socket.user = name;
    addUser = true;
    numUsers++;

    socket.broadcast.emit("user-join", { name, numUsers }); //gửi thông báo cho client khi người dùng vào phòng chat

    socket.on("disconnect", () => {
      numUsers--;
      socket.broadcast.emit("user-left", { name, numUsers }); //gửi thông báo cho client khi người dùng rời phòng chat
    });
  });

  //server nhận tin nhắn từ client
  socket.on("client-sent-data", (data) => {
    //server gửi tin nhắn tới client
    io.emit("server-sent-data", data);
  });
});

server.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

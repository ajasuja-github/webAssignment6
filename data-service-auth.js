var bcrypt = require("bcryptjs");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
  },
  password: String,
  email: String,
  loginHistory: [
    {
      dateTime: Date,
      userAgent: String,
    },
  ],
});

let User; // to be defined on new connection (refer initialize)

module.exports.initialize = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(
      "mongodb+srv://dbUser:dbUserPassword@webast6.7ak7xhf.mongodb.net/?retryWrites=true&w=majority"
    );
    db.on("error", (err) => {
      reject(err);
    });
    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    if (userData.password != userData.password2) {
      reject("Passwords do not match");
    } else {
      bcrypt
        .hash(userData.password, 10)
        .then(function (hash) {
          userData.password = hash;
          let newUser = new User(userData);
          newUser
            .save()
            .then((response) => {
              resolve();
            })
            .catch((err) => {
              if (err.code == 11000) {
                reject("User Name already taken");
              } else {
                reject("There was an error creating the user: " + err);
              }
            });
        })
        .catch(function () {
          reject("There was an error encrypting the password");
        });
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.find({ userName: userData.userName })
      .exec()
      .then(function (users) {
        if (users.length == 0) {
          reject("Unable to find user: " + userData.userName);
        } else {
          bcrypt
            .compare(userData.password, users[0].password)
            .then(function (result) {
              if (!result) {
                reject("Incorrect Password for user: " + userData.userName);
              } else {
                if (!users[0].loginHistory) {
                  users[0].loginHistory = [];
                }
                users[0].loginHistory.push({
                  dateTime: new Date().toString(),
                  userAgent: userData.userAgent,
                });
                User.updateOne(
                  { userName: users[0].userName },
                  { $set: { loginHistory: users[0].loginHistory } }
                )
                  .exec()
                  .then(function () {
                    resolve(users[0]);
                  })
                  .catch(function (err) {
                    reject("There was an error verifying the user: " + err);
                  });
              }
            });
        }
      })
      .catch(function () {
        reject("Unable to find user: " + userData.userName);
      });
  });
};

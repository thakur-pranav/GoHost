const mongoose = require("mongoose");
const { dbUrl, port } = require("./config.js");
const app = require("./app.js");

app.listen(port, () => {
  console.log(`server is listening to port ${port}`);
});

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

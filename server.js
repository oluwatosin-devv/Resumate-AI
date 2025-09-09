require("dotenv").config({ path: ".env" });

const app = require("./app");

//start server

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on port: ${port}....`);
});

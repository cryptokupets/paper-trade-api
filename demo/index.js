"use strict";

require("dotenv").config();

const express = require("express");
const { PaperTradeServer } = require("../lib/server");

const app = express();
const port = process.env.PORT;

app.use("/odata", PaperTradeServer.create());

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});

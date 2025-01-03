const express = require("express");
const app = express();
const { Client, LocalAuth, AuthStrategy, Buttons } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const pages = require("./pages");
const localData = {};

const client = new Client({
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/pages", pages);

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Client is ready!");

  app.post(
    "/send/:phoneID",
    function(req, res, next) {
      const phone = req.params.phoneID;
      console.log(req.body);

      client.sendMessage(phone + "@c.us", req.body.msg).then(function() {
        next();
      });
    },
    function(req, res) {
      res.sendStatus(200);
      console.log("API LOGS");
    }
  );
});

var qr_code = "";

app.get("/qr", (req, res) => {
  // Set headers to enable SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(qr_code);
  var timer = setInterval(function() {
    res.write(`data: ${JSON.stringify({ qr: qr_code })} \n\n`);
  }, 2000);

  req.on("close", function() {
    clearInterval(timer);
  });
});

// When the client received QR-Code
client.on("qr", (qr) => {
  console.log(qr);
  qrcode.generate(qr, { small: true });
  qr_code = qr;

  app.get("/", function(req, res) {
    res.send(qr);
  });
});

// Start your client
client.initialize();

app.get("/events", (req, res) => {
  // Set headers to enable SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write("");

  function handleMessages(message) {
    console.log(message.from);
    console.log(message.body);
    console.log(message.fromMe);

    res.write(`data: ${JSON.stringify(message)} \n\n`);
  }

  client.on("message_create", handleMessages);

  req.on("close", function() {
    client.off("message_create", handleMessages);
  });
});

app.listen((process.env.PORT || 3000));
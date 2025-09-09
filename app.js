const express = require("express");
const fs = require("fs");
const Telegrambot = require("node-telegram-bot-api");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const processResume = require("./utils");
const pdfkit = require("pdfkit");
const app = express();
const userSession = {};
// const { kv } = require("@vercel/kv");

app.use(express.json());

const bot = new Telegrambot(process.env.BOT_TOKEN, { polling: true });

app.post(`/api/${process.env.BOT_TOKEN}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});

app.get("/ap1/v1/resumebot/ping", (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "pong... server healthy",
  });
});

//start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Welcome to *ResuMate Bot*!  
  
  I’m here to transform your resume into a stronger, job-ready version using proven methods, and I’ll even tailor it to match the job description you’re applying for.
  
  📄 Just send me your resume in **PDF format**, along with the job description, and I’ll:  
  ✅ Analyze your current resume  
  ✅ Enhance your experience with powerful action verbs  
  ✅ Reformat for clarity and impact  
  ✅ Tailor it to the job description so you look like the perfect fit  
  ✅ Send you back a polished PDF  
  
  🚀 Let’s get started — upload your resume first (as pdf) and then job description`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/creator/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👨‍💻 This bot was created by *Oluwatosin Oni*.\n\n📩 Contact: @oluwatosin.dev@gmail.com",
    { parse_mode: "Markdown" }
  );
});

//listen for document send
bot.on("document", async (msg) => {
  const chatID = msg.chat.id;

  //check for only pdf files
  if (msg.document.mime_type !== "application/pdf") {
    return bot.sendMessage(chatID, "❌❌ Please upload as a PDF ");
  }

  //get file from telegram
  try {
    const fileid = msg.document.file_id;
    const file = await bot.getFile(fileid);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const data = await pdfParse(response.data);
    // const originalPdfText = data.text;

    // const session = {
    //   resume: data.text,
    //   fileName: msg.document.file_name.split(".")[0],
    // };
    // await kv.setex(`resume:${chatID}`, 300, JSON.stringify(session));

    userSession[chatID] = {
      resume: data.text,
      fileName: msg.document.file_name.split(".")[0],
    };

    //ask for job description.
    bot.sendMessage(
      chatID,
      "✅ Resume received!\n\nNow please paste or upload the *job description* for the role you’re applying for.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Document error:", err);
    bot.sendMessage(chatID, "⚠️ Error reading the resume. Please try again.");
  }
});

//listen for text message(job description)
bot.on("message", async (msg) => {
  const chatID = msg.chat.id;

  if (msg.document) return;
  try {
    // const sessionStr = await kv.get(`resume:${chatID}`);
    // if (!sessionStr) return;
    // const session = JSON.parse(sessionStr);
    // session.jobDescription = msg.text;

    if (userSession[chatID] && !userSession[chatID].jobDescription) {
      userSession[chatID].jobDescription = msg.text;
      bot.sendMessage(
        chatID,
        `📋 Got the job description! I’ll now tailor your resume to this role and generate a polished PDF for you. 🚀  
    
    ⚠️ *Note:* Some styling or formatting from your original PDF may not be preserved, but the content will be fully optimized for the job.`,
        { parse_mode: "Markdown" }
      );

      const response = await processResume(
        bot,
        chatID,
        userSession[chatID].resume,
        userSession[chatID].jobDescription
      );

      const enhancedText = response.choices[0].message.content;
      //create-a-new-pdf
      const output = `/tmp/${userSession[chatID].fileName}_enhanced.pdf`;
      const pdfDoc = new pdfkit();
      const writeStream = fs.createWriteStream(output);
      pdfDoc.pipe(writeStream);
      pdfDoc.fontSize(12).text(enhancedText, { align: "left" });
      pdfDoc.end();

      // enhanced resume

      writeStream.on("finish", async () => {
        await bot.sendDocument(chatID, output);
        fs.unlinkSync(output); // delete the file immediately after sending
        console.log(`Deleted temp file: ${output}`);
      });
    }
  } catch (err) {
    console.error("Message error:", err);
    bot.sendMessage(chatID, "⚠️ Something went wrong. Please try again.");
  }
});

module.exports = app;

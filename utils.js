const openAI = require("openai");
const enhanceResumeBot = new openAI({
  apiKey: process.env.OPEN_AI_KEY,
});

module.exports = async function processResume(
  bot,
  chatID,
  resume,
  jobDescription
) {
  const loadingMessage = await bot.sendMessage(
    chatID,
    "⏳ Rewriting your resume... ◐"
  );

  // Start spinner
  const spinnerFrames = ["◐", "◓", "◑", "◒"];
  let i = 0;
  let lastFrame = null;

  const intervalId = setInterval(() => {
    const frame = spinnerFrames[i];
    const newText = `⏳ Rewriting your resume... ${frame}`;

    // ✅ Only update if the frame changed
    if (newText !== lastFrame) {
      bot
        .editMessageText(newText, {
          chat_id: chatID,
          message_id: loadingMessage.message_id,
        })
        .catch((err) => {
          // Ignore harmless "message is not modified" errors
          if (
            !err.response ||
            err.response.body.description !==
              "Bad Request: message is not modified"
          ) {
            console.error("Spinner error:", err.message);
          }
        });

      lastFrame = newText;
    }

    i = (i + 1) % spinnerFrames.length;
  }, 500);

  //call gpt
  const response = enhanceResumeBot.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert career coach and resume writer. Your task is to rewrite and enhance a resume so that it matches the provided job description as closely as possible, while remaining truthful to the candidate’s experience.",
      },
      {
        role: "user",
        content: `
  Candidate Resume:
  ${resume}

  Job Description:
  ${jobDescription}

  Now rewrite the resume so that it highlights the most relevant experience and skills,
  incorporates key terms from the job description, and positions the candidate as a top applicant.
  Return only the improved resume.
  ### Instructions:
  - Use clear, professional language.
  - Optimize for Applicant Tracking Systems (ATS) by incorporating keywords from the job description.
  - Use strong action verbs.
  - Apply the STAR method (Situation, Task, Action, Result) when improving bullet points.
  - Reorder sections so that the most relevant experience appears first.
  - Remove or minimize irrelevant experience.
  - Keep formatting professional and concise.

        `,
      },
    ],
  });

  clearInterval(intervalId);

  return response;
};

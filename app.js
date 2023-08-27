require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(cors({
    origin: '*'
}));

const app = express();
const port = 8080;

const OPENAI_KEY = process.env.OPENAI_KEY;

const MODEL = "gpt-3.5-turbo";
const TEMPERATURE = 0.9;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

let questions = {};

app.use(bodyParser.json());

app.get('/api', (req, res) => {
  res.status(200).send('API is working!');
});

app.post('/api/sendq', async (req, res) => {
    const { question, useranswer, userID, interview_type, seniority_level } = req.body;

    if (question && useranswer) {
        const q = {
            userID,
            question,
            useranswer,
            interview_type,
            seniority_level,
            feedback: null,
        };

        questions[`${userID} + ${question}`] = q;

        // Make OpenAI call
        req_gpt(q);

        res.status(201).json({ message: "Question received!" });
    } else {
        res.status(400).json({ message: "No question provided!" });
    }
});

async function req_gpt(q) {
    const struct = `[{title : "", rating: "", feedback:""},{idealAnswer:"provide correct answer here"}]`;
    let prompt = null;
    // Interview types//
    if (q.interview_type === "Technical") {
      prompt = `You are the strict interviewer. \nSeniority level: ${q.seniority_level}\nInterview_type: ${q.interview_type}\nQuestion: ${q.question}\nAnswer: ${q.useranswer} \nYour task is to evaluate the interview answer based on Correctness. Rate the user answer on a scale of 1 to 10, providing constructive feedback for each, provide ideal answer based you your feedback Make sure user is follwing STAR approach, only provide it in the following data stracture (JSON) ${struct}.`;
    } else {
      // Other
      prompt = `You are the strict interviewer. \nSeniority level: ${q.seniority_level}\nInterview_type: ${q.interview_type}\nQuestion: ${q.question}\nAnswer: ${q.useranswer} \nYour task is to evaluate the interview answer based on Content, Clarity, Coherence, Confidence, Professionalism, Appropriateness, and Relevance. Rate each aspect on a scale of 1 to 10, providing constructive feedback for each, provide ideal answer based you your feedback Make sure user is follwing STAR approach, only provide it in the following data stracture (JSON) ${struct}.`;
    }

    const headers = {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
    };

    const data = {
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [
            { role: "system", content: "You are an interviewer." },
            { role: "user", content: prompt }
        ]
    };

    try {
        // console.log("asking question") // delete thiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiis
        const response = await axios.post(OPENAI_URL, data, { headers });
        // console.log(response.data.choices[0].message.content)
        q.feedback = response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling OpenAI API:", error.response.data);
    }
}

app.post('/api/checkq', (req, res) => {
    const { userID, question } = req.body;
    const q = questions[`${userID} + ${question}`];

    if (q && q.feedback) {
        res.status(201).json({ feedback: eval(`(${q.feedback})`)});
        // res.status(201).json({ feedback: q.feedback });
    } else {
        res.status(400).json({ message: "No feedback yet!" });
    }
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
});

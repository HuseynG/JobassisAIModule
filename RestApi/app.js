require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 8080;

const OPENAI_KEY = process.env.OPENAI_KEY;

const MODEL = "gpt-3.5-turbo";
const TEMPERATURE = 0.9;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

let questions = {};

app.use(bodyParser.json());

app.post('/sendq', async (req, res) => {
    const { question, useranswer, userID } = req.body;

    if (question && useranswer) {
        const q = {
            userID,
            question,
            useranswer,
            feedback: null,
            seniority_level: null,
            interview_type: null
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
    const prompt = `You are the strict interviewer. Question: ${q.question}\nAnswer: ${q.useranswer} Your task is to evaluate the interview answer based on Correctness. Rate based on a scale of 1 to 10, providing constructive feedback only provide it in this data structure ${struct}.`;

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
        const response = await axios.post(OPENAI_URL, data, { headers });
        q.feedback = response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling OpenAI API:", error.response.data);
    }
}

app.post('/checkq', (req, res) => {
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

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
// make sure you update this to your website domain //////////////////////////
const cors = require('cors');
app.use(cors({
    origin: '*'
}));

const port = 8080;

const OPENAI_KEY = process.env.OPENAI_KEY;

const MODEL = "gpt-3.5-turbo";
const TEMPERATURE = 0.9;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

let questions = {};
let followupsquestions = {};

app.use(bodyParser.json());

app.get('/api', (req, res) => {
  res.status(200).send('API is working!');
});

// get interview question feedback and check when ready //
app.post('/api/getfeedback', async (req, res) => {
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
        req_feeback_gpt(q);

        res.status(201).json({ message: "User's q&a is received! Processing feedback." });
    } else {
        res.status(400).json({ message: "No question provided! Or something went wrong" });
    }
});

async function req_feeback_gpt(q) {
    const struct = `[{title : "", rating: "", feedback:""},{idealAnswer:"provide correct answer here"}]`;
    let prompt = null;
    // Interview types//
    if (q.interview_type === "Technical") {
        prompt = `You are the strict interviewer. \nSeniority level: ${q.seniority_level}\nInterview_type: ${q.interview_type}\nQuestion: ${q.question}\nAnswer: ${q.useranswer} \nYour task is to evaluate the interview answer based on Correctness. Rate the user answer on a scale of 1 to 10, providing constructive feedback for each, provide ideal answer based you your feedback Make sure user is following STAR approach, only provide it in the following data structure (JSON) ${struct}.`;
    } else {
        // Other
        prompt = `You are the strict interviewer. \nSeniority level: ${q.seniority_level}\nInterview_type: ${q.interview_type}\nQuestion: ${q.question}\nAnswer: ${q.useranswer} \nYour task is to evaluate the interview answer based on Content, Clarity, Coherence, Confidence, Professionalism, Appropriateness, and Relevance. Rate each aspect on a scale of 1 to 10, providing constructive feedback for each, provide ideal answer based you your feedback Make sure user is following STAR approach, only provide it in the following data structure (JSON) ${struct}.`;
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
        ////////// trying calling one more time or what??????????????????
        console.error("Error calling OpenAI API:", error.response.data);
    }
}

app.post('/api/isfeedbackready', (req, res) => {
    const { userID, question } = req.body;
    const q = questions[`${userID} + ${question}`];

    if (q && q.feedback) {
        res.status(201).json({ feedback: eval(`(${q.feedback})`)});
        delete questions[`${userID} + ${question}`]; //? you gotta set up delete timeout in case we need to wait if there is another request for same user id and and question
    } else if (q && !q.feedback) {
        res.status(202).json({ message: "No feedback yet!" });
    } else {
        res.status(400).json({ message: "Something went wrong!" });
    }
});

// get follow up question based on question and answer//
app.post('/api/getfollowupq', async (req, res) => {
    const { question, useranswer, userID, interview_type, seniority_level } = req.body;

    if (question && useranswer) {
        const q = {
            userID,
            question,
            useranswer,
            interview_type,
            seniority_level,
            followup_qs: null,
        };

        followupsquestions[`${userID} + ${question}`] = q;

        // Make OpenAI call
        req_followupq_gpt(q);

        res.status(201).json({ message: "User's q&a is received! Processing follow-up questions." });
    } else {
        res.status(400).json({ message: "No question provided!" });
    }
});

async function req_followupq_gpt(q) {
    const struct = `[{ "question": "", "rating": "" }]`;
    prompt = `
    You're acting as a strict and tricky interviewer.

    - Seniority Level: ${q.seniority_level}
    - Interview Type: ${q.interview_type}
    - User's Question: ${q.question}
    - User's Answer: ${q.useranswer}

    Your objective: 
    Analyze the provided question and answer. Generate up to 5 follow-up questions, but only if they are relevant. Rank each question based on its relevance to the original one, with a score ranging from 1 (least related) to 10 (highly related). 
    Prioritize and list the most pertinent questions first.
    
    Your response should fit the structure: ${struct}
    `;
    
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
        q.followup_qs = response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling OpenAI API:", error.response.data);
    }
}

app.post('/api/isfollowupqready', (req, res) => {
    const { userID, question } = req.body;
    const q = followupsquestions[`${userID} + ${question}`];

    if (q && q.followup_qs) {
        res.status(201).json({ followup_qs: eval(`(${q.followup_qs})`)});
        delete followupsquestions[`${userID} + ${question}`]; //? you gotta set up delete timeout in case we need to wait if there is another request for same user id and and question
    } else if (q && !q.followup_qs) {
        res.status(202).json({ message: "No follow-up questions yet!" });
    } else {
        res.status(400).json({ message: "Something went wrong!" });
    }
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
});

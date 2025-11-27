"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const openai_1 = require("@langchain/openai");
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const openevals_1 = require("openevals");
const csv_writer_1 = require("csv-writer");
const dataset_1 = require("./dataset");
dotenv.config();
async function main() {
    console.log("Starting multi-model evaluation...");
    // 1. Define Models
    const models = [
        {
            name: "gpt-3.5-turbo",
            llm: new openai_1.ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
        },
        {
            name: "gemini-pro",
            llm: new google_genai_1.ChatGoogleGenerativeAI({ model: "gemini-pro", temperature: 0 }),
        },
    ];
    // 2. Initialize Evaluator
    // We use a strong model (GPT-4) as the judge for all outputs
    const correctnessEvaluator = (0, openevals_1.createLLMAsJudge)({
        prompt: openevals_1.CORRECTNESS_PROMPT,
        feedbackKey: "correctness",
        model: "gpt-4",
    });
    const results = [];
    // 3. Run Evaluation Loop
    for (const modelConfig of models) {
        console.log(`\nTesting Model: ${modelConfig.name}`);
        const prompt = prompts_1.PromptTemplate.fromTemplate(`Answer the following question concisely: {input}`);
        const chain = prompt.pipe(modelConfig.llm).pipe(new output_parsers_1.StringOutputParser());
        for (const item of dataset_1.dataset) {
            // console.log(`  Input: ${item.input}`);
            try {
                // Generate prediction
                const prediction = await chain.invoke({ input: item.input });
                // Evaluate
                const evalResult = await correctnessEvaluator({
                    inputs: item.input,
                    outputs: prediction,
                    referenceOutputs: item.reference,
                });
                results.push({
                    model: modelConfig.name,
                    input: item.input,
                    prediction: prediction,
                    reference: item.reference,
                    score: evalResult.score,
                    comment: evalResult.comment,
                });
            }
            catch (error) {
                console.error(`  Error evaluating ${item.input} with ${modelConfig.name}:`, error);
                results.push({
                    model: modelConfig.name,
                    input: item.input,
                    prediction: "ERROR",
                    reference: item.reference,
                    score: 0,
                    comment: String(error),
                });
            }
        }
    }
    // 4. Output Results
    console.log("\n--- Evaluation Results ---");
    console.table(results.map(r => ({
        model: r.model,
        input: r.input.substring(0, 20) + "...",
        score: r.score
    })));
    // 5. Write to CSV
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: 'results.csv',
        header: [
            { id: 'model', title: 'Model' },
            { id: 'input', title: 'Input' },
            { id: 'prediction', title: 'Prediction' },
            { id: 'reference', title: 'Reference' },
            { id: 'score', title: 'Score' },
            { id: 'comment', title: 'Comment' },
        ],
    });
    await csvWriter.writeRecords(results);
    console.log("\nResults written to results.csv");
}
main().catch(console.error);

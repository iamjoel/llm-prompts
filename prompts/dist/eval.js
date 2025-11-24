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
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const openevals_1 = require("openevals");
dotenv.config();
// 1. Define the Dataset
// In a real scenario, this might come from a file or LangSmith dataset
const dataset = [
    {
        input: "What is the capital of France?",
        reference: "The capital of France is Paris.",
    },
    {
        input: "Who wrote 'Romeo and Juliet'?",
        reference: "William Shakespeare wrote 'Romeo and Juliet'.",
    },
    {
        input: "What is 2 + 2?",
        reference: "2 + 2 equals 4.",
    },
];
async function main() {
    console.log("Starting evaluation with OpenEvals...");
    // 2. Define the Model and Prompt
    // This is the "System" we are testing
    const model = new openai_1.ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
    });
    const prompt = prompts_1.PromptTemplate.fromTemplate(`Answer the following question concisely: {input}`);
    const chain = prompt.pipe(model).pipe(new output_parsers_1.StringOutputParser());
    // 3. Initialize Evaluators
    // Using OpenEvals createLLMAsJudge
    const correctnessEvaluator = (0, openevals_1.createLLMAsJudge)({
        prompt: openevals_1.CORRECTNESS_PROMPT,
        feedbackKey: "correctness",
        model: "gpt-4", // Use a strong model for evaluation
    });
    // 4. Run Evaluation
    const results = [];
    for (const item of dataset) {
        console.log(`Evaluating input: ${item.input}`);
        // Generate prediction
        const prediction = await chain.invoke({ input: item.input });
        console.log(`Prediction: ${prediction}`);
        // Evaluate
        // OpenEvals expects { inputs, outputs, referenceOutputs }
        // Note: The prompt expects {inputs}, {outputs}, {reference_outputs} (snake_case in prompt, but passed as camelCase in JS obj usually mapped)
        // Let's check the docs example again: 
        // const evalResult = await correctnessEvaluator({ inputs, outputs, referenceOutputs });
        const evalResult = await correctnessEvaluator({
            inputs: item.input,
            outputs: prediction,
            referenceOutputs: item.reference,
        });
        console.log(`Evaluation Result:`, evalResult);
        results.push({
            ...item,
            prediction,
            evaluation: evalResult,
        });
    }
    // 5. Summary
    console.log("\n--- Evaluation Summary ---");
    // OpenEvals returns { key, score, comment, ... }
    // Score is usually boolean or number.
    const passed = results.filter(r => r.evaluation.score === 1 || r.evaluation.score === true).length;
    console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${results.length - passed}`);
}
main().catch(console.error);

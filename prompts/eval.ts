import * as dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";

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
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  const prompt = PromptTemplate.fromTemplate(`Answer the following question concisely: {input}`);
  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  // 3. Initialize Evaluators
  // Using OpenEvals createLLMAsJudge
  const correctnessEvaluator = createLLMAsJudge({
    prompt: CORRECTNESS_PROMPT,
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

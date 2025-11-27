import * as dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";
import { createObjectCsvWriter } from "csv-writer";
import { dataset } from "./dataset";

dotenv.config();

async function main() {
  console.log("Starting multi-model evaluation...");

  // 1. Define Models
  const models = [
    {
      name: "gpt-3.5-turbo",
      llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
    },
    {
      name: "gemini-2.5-flash",
      llm: new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash", temperature: 0 }),
    },
  ];

  // 2. Initialize Evaluator
  // We use a strong model (GPT-4) as the judge for all outputs
  const correctnessEvaluator = createLLMAsJudge({
    prompt: CORRECTNESS_PROMPT,
    feedbackKey: "correctness",
    model: "gpt-4",
  });

  const results = [];

  // 3. Run Evaluation Loop
  for (const modelConfig of models) {
    console.log(`\nTesting Model: ${modelConfig.name}`);

    const prompt = PromptTemplate.fromTemplate(`Answer the following question concisely: {input}`);
    const chain = prompt.pipe(modelConfig.llm).pipe(new StringOutputParser());

    for (const item of dataset) {
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
      } catch (error) {
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
  const csvWriter = createObjectCsvWriter({
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

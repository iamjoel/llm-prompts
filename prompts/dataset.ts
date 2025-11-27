export interface DatasetItem {
  input: string;
  reference: string;
}

export const dataset: DatasetItem[] = [
  {
    input: "What is the capital of France?",
    reference: "The capital of France is Paris.",
  },
  // {
  //   input: "Who wrote 'Romeo and Juliet'?",
  //   reference: "William Shakespeare wrote 'Romeo and Juliet'.",
  // },
  // {
  //   input: "What is 2 + 2?",
  //   reference: "2 + 2 equals 4.",
  // },
];

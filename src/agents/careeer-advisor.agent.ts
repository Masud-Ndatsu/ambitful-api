import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph";
import { careerAdvisorTools } from "../tools/careerAdvisorTools";

export const createCareerAdvisorAgent = (apiKey: string) => {
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-flash",
    temperature: 0.7,
    maxOutputTokens: 2048,
    apiKey,
  });

  // Bind tools to model
  const modelWithTools = model.bindTools(careerAdvisorTools);

  // Create ReAct-style agent with LangGraph
  const agent = createReactAgent({
    llm: modelWithTools,
    tools: careerAdvisorTools,
  });

  return agent;
};

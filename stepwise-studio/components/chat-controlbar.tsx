import { Loader2, SendHorizonal } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { useChatBoxStore } from "./chatbox";
import { ChatMessage, useChatHistoryStore } from "./chat-history";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { LLMSelector, useLLMSelectorStore } from "./llm-selector";
import { useOpenAIConfiguration } from "./openai-configure-card";
import OpenAI from "openai";
import Image from "next/image";
import { toast } from "sonner";
import { useClaudeConfiguration } from "./claude-configure-card";
import Anthropic from "@anthropic-ai/sdk";
import {
	MessageParam,
	Model,
	TextBlock,
} from "@anthropic-ai/sdk/resources/messages.mjs";
import StepWiseIcon from "@/public/stepwise-logo.svg";
import {
	Chat,
	ChatCompletionMessageParam,
	ChatCompletionTool,
	ChatModel,
} from "openai/resources/index.mjs";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { useWorkflowStore } from "@/hooks/useWorkflow";
export const ChatControlBar: React.FC = () => {
	const message = useChatBoxStore((state) => state.message);
	const chatHistory = useChatHistoryStore((state) => state.messages);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const claudeLLMs = useClaudeConfiguration((state) => state.LLMTypes);
	const openaiLLMs = useOpenAIConfiguration((state) => state.LLMTypes);
	const openAIApiKey = useOpenAIConfiguration((state) => state.apiKey);
	const claudeApiKey = useClaudeConfiguration((state) => state.apiKey);
	const setMessage = useChatBoxStore((state) => state.setMessage);
	const addMessage = useChatHistoryStore((state) => state.addMessage);
	const configuration = useStepwiseServerConfiguration();
	const [busy, setBusy] = React.useState(false);
	const { user } = useAuth0();
	const llmName = "Geeno";
	const selectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.selectedStepRunHistory,
	);
	const workflow = useWorkflowStore((state) => state.selectedWorkflow)!;
	const createSnapshotFromSelectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.createLatestStepRunSnapShotFromRunHistory,
	);
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const sendMessage = async () => {
		let userMessage: ChatMessage;
		if (configuration?.enableAuth0Authentication) {
			userMessage = {
				message,
				sender: user?.name,
				fromUser: true,
				avatar: user?.picture,
			};
		} else {
			userMessage = {
				message,
				fromUser: true,
			};
		}
		var snapShot = createSnapshotFromSelectedStepRunHistory(
			selectedWorkflow!,
			selectedStepRunHistory,
		);
		var variables = snapShot.filter((s) => s.result !== undefined);
		const systemMessagePrompt = `
		You are a helpful assistant. Your name is ${llmName}.

		Here are the context variables. You can refer to them in your responses.
		${variables.map((v) => `${v.result?.name}: ${v.result?.displayValue}`).join("\n")}
		`;

		console.log(systemMessagePrompt);
		addMessage(userMessage);
		setMessage("");
		const steps = workflow.steps;
		console.log(steps);
		if (openaiLLMs.find((f) => f === selectedLLM) && openAIApiKey) {
			const openAIClient = new OpenAI({
				apiKey: openAIApiKey,
				dangerouslyAllowBrowser: true,
			});

			const openAIChatHistory = [...chatHistory, userMessage].map(
				(msg) => {
					if (msg.fromUser) {
						return {
							role: "user",
							content: msg.message,
						} as ChatCompletionMessageParam;
					} else {
						return {
							role: "assistant",
							content: msg.message,
						} as ChatCompletionMessageParam;
					}
				},
			);

			const systemMessage: ChatCompletionMessageParam = {
				role: "system",
				content: systemMessagePrompt,
			};

			const tools: ChatCompletionTool[] = steps.map((step) => ({
				function: {
					name: step.name,
					description: step.description,
					parameters: {
						type: "object",
						properties: step.parameters!.reduce((acc: { [key: string]: any }, param) => {
							const allowedTypes = ["String", "Number", "Boolean", "String[]", "Integer", "Float", "Double"];
							const jsonTypeMap: { [key: string]: string } = {
								String: "string",
								Number: "number",
								Boolean: "boolean",
								"String[]": "array",
								Integer: "integer",
								Float: "number",
								Double: "number",
							};
							const itemTypeMap: { [key: string]: string | undefined } = {
								String: undefined,
								Number: undefined,
								Boolean: undefined,
								"String[]": "string",
								Integer: undefined,
								Float: undefined,
								Double: undefined,
							};
							if (!allowedTypes.includes(param.parameter_type)) {
								return acc;
							}
							acc[param.variable_name] = {
								type: jsonTypeMap[param.parameter_type],
								items: itemTypeMap[param.parameter_type] ? { type: itemTypeMap[param.parameter_type] } : undefined,
							};
							return acc;
						}, {}),
					},
				},
				type: "function",
			} as ChatCompletionTool));

			console.log(tools);
			try {
				setBusy(true);
				const chatCompletion =
					await openAIClient.chat.completions.create({
						messages: [systemMessage, ...openAIChatHistory],
						model: selectedLLM as ChatModel,
						tool_choice: 'auto',
						tools: tools,
					});
				console.log(chatCompletion);
				addMessage({
					message: chatCompletion.choices[0].message.content!,
					sender: llmName,
					fromUser: false,
					avatar: (
						<Image
							src={StepWiseIcon}
							alt="avatar"
							className="w-10 h-10 rounded-full"
						/>
					),
				});
			} catch (error) {
				toast.error(JSON.stringify(error));
			} finally {
				setBusy(false);
			}
		}

		if (claudeLLMs.find((f) => f === selectedLLM) && claudeApiKey) {
			const claudeClient = new Anthropic({
				apiKey: claudeApiKey,
				dangerouslyAllowBrowser: true,
			});

			const claudeChatHistory: MessageParam[] = [
				...chatHistory,
				userMessage,
			].map((msg) => {
				if (msg.fromUser) {
					return {
						role: "user",
						content: msg.message,
					} as MessageParam;
				} else {
					return {
						role: "assistant",
						content: msg.message,
					} as MessageParam;
				}
			});

			try {
				setBusy(true);
				const chatCompletion = await claudeClient.messages.create({
					model: selectedLLM as Model,
					messages: claudeChatHistory,
					max_tokens: 1024,
					system: systemMessagePrompt,
				});
				console.log(chatCompletion);
				// if content[0] is text, then it is a text completion
				if (chatCompletion.content[0].type === "text") {
					addMessage({
						message: (chatCompletion.content[0] as TextBlock).text,
						sender: llmName,
						fromUser: false,
						avatar: (
							<Image
								src={StepWiseIcon}
								alt="avatar"
								className="w-10 h-10 rounded-full"
							/>
						),
					});
				}
			} catch (error) {
				toast.error(JSON.stringify(error));
			} finally {
				setBusy(false);
			}
		}
	};
	return (
		<div className="flex items-center justify-end w-full">
			<div className="flex grow">
				<LLMSelector />
			</div>
			{busy && <Loader2 className="h-4 w-4 animate-spin" />}
			<Button
				variant={"default"}
				size={"smallIcon"}
				onClick={() => sendMessage()}
				disabled={message === ""}
			>
				<SendHorizonal />
			</Button>
		</div>
	);
};

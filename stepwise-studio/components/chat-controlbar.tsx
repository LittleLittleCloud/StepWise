import { Bot, Loader2, SendHorizonal, User, Variable } from "lucide-react";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { useChatBoxStore } from "./chatbox";
import {
	ChatMessage,
	ChatMessageContent,
	ChatTool,
	useChatHistoryStore,
} from "./chat-history";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { LLMSelector, OpenAI_LLM, useLLMSelectorStore } from "./llm-selector";
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
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageParam,
	ChatCompletionMessageToolCall,
	ChatCompletionTool,
	ChatCompletionToolMessageParam,
	ChatCompletionUserMessageParam,
	ChatModel,
} from "openai/resources/index.mjs";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { useWorkflowStore } from "@/hooks/useWorkflow";
import { StepRunDTO, VariableDTO, WorkflowDTO } from "@/stepwise-client";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";
export const ChatControlBar: React.FC = () => {
	const message = useChatBoxStore((state) => state.message);
	const chatHistory = useChatHistoryStore((state) => state.messages);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const setMessage = useChatBoxStore((state) => state.setMessage);
	const addMessage = useChatHistoryStore((state) => state.addMessage);
	const configuration = useStepwiseServerConfiguration();
	const [busy, setBusy] = React.useState(false);
	const { user } = useAuth0();
	const llmName = "Geeno";
	const selectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.selectedStepRunHistory,
	);
	const executeStep = useWorkflowEngine((state) => state.executeStep);
	const createSnapshotFromSelectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.createLatestStepRunSnapShotFromRunHistory,
	);
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const sendMessage = async (
		message: string,
		workflow: WorkflowDTO,
		stepRunHistory: StepRunDTO[],
		chatHistory: ChatMessageContent[],
	) => {
		if (selectedLLM === undefined) {
			toast.error("Please select a language model");
			return;
		}

		if (message !== "") {
			let userMessage: ChatMessage;
			if (configuration?.enableAuth0Authentication) {
				userMessage = {
					message,
					sender: user?.name ?? "Human",
					fromUser: true,
					avatar: user?.picture ?? (
						// Bot but flipped horizontally
						<Bot className="w-10 h-10 rounded-full scale-x-[-1]" />
					),

					type: "text",
				};
			} else {
				userMessage = {
					message,
					sender: "Human",
					avatar: (
						<Bot className="w-10 h-10 rounded-full scale-x-[-1]" />
					),
					fromUser: true,
					type: "text",
				};
			}
			addMessage(userMessage);
			setMessage("");
			chatHistory.push(userMessage);
		}
		const contextVariables = createSnapshotFromSelectedStepRunHistory(
			workflow!,
			stepRunHistory!,
		).filter((s) => s.result !== undefined);
		let systemMessagePrompt = `
You are a helpful workflow assistant. Your name is ${llmName}.

You are currently assisting user with the workflow ${workflow.name}. You can either invoke the workflow or provide assistance with the steps in the workflow.

When invoking a step in workflow, you don't need to consider whether it's pre-requisite steps are executed or not. The workflow engine will take care of it. So you can directly invoke the step.

Each workflow is associated with a context which contains the intermediate results of the workflow execution.

## current context:
${
	contextVariables.length === 0
		? "No context available"
		: contextVariables
				.map((v) => `${v.result?.name}: ${v.result?.displayValue}`)
				.join("\n")
}

You don't need to provide the arguments if they are already available in the context. You can override the context variables by providing the arguments explicitly.
`;

		const steps = workflow.steps;
		if (
			selectedLLM?.type === "OpenAI" &&
			(selectedLLM as OpenAI_LLM).apiKey
		) {
			const openAIClient = new OpenAI({
				apiKey: (selectedLLM as OpenAI_LLM).apiKey,
				dangerouslyAllowBrowser: true,
			});

			const openAIChatHistory: ChatCompletionMessageParam[] = [];

			for (const msg of chatHistory) {
				if (msg.type === "text" && msg.fromUser) {
					openAIChatHistory.push({
						role: "user",
						content: msg.message,
					} as ChatCompletionUserMessageParam);
				} else if (msg.type === "text" && !msg.fromUser) {
					openAIChatHistory.push({
						role: "assistant",
						content: msg.message,
					} as ChatCompletionAssistantMessageParam);
				} else if (msg.type === "tool") {
					openAIChatHistory.push({
						role: "assistant",
						tool_calls: [
							{
								type: "function",
								id: msg.id,
								function: {
									name: msg.name,
									arguments: msg.argument,
								} as ChatCompletionMessageToolCall.Function,
							},
						] as ChatCompletionMessageToolCall[],
					} as ChatCompletionAssistantMessageParam);
					openAIChatHistory.push({
						role: "tool",
						content: msg.displayValue,
						tool_call_id: msg.id,
					} as ChatCompletionToolMessageParam);
				}
			}

			const tools: ChatCompletionTool[] = steps.map(
				(step) =>
					({
						function: {
							name: step.name,
							description: step.description,
							parameters: {
								type: "object",
								properties: step.parameters!.reduce(
									(acc: { [key: string]: any }, param) => {
										const allowedTypes = [
											"String",
											"Number",
											"Boolean",
											"String[]",
											"Int32",
											"Int64",
											"Float",
											"Double",
										];
										const jsonTypeMap: {
											[key: string]: string;
										} = {
											String: "string",
											Number: "number",
											Boolean: "boolean",
											"String[]": "array",
											Integer: "integer",
											Int32: "integer",
											Int64: "integer",
											Float: "number",
											Double: "number",
										};
										const itemTypeMap: {
											[key: string]: string | undefined;
										} = {
											String: undefined,
											Number: undefined,
											Boolean: undefined,
											"String[]": "string",
											Integer: undefined,
											Int32: undefined,
											Int64: undefined,
											Float: undefined,
											Double: undefined,
										};
										if (
											!allowedTypes.includes(
												param.parameter_type,
											)
										) {
											return acc;
										}
										acc[param.variable_name] = {
											type: jsonTypeMap[
												param.parameter_type
											],
											items: itemTypeMap[
												param.parameter_type
											]
												? {
														type: itemTypeMap[
															param.parameter_type
														],
													}
												: undefined,
										};
										return acc;
									},
									{},
								),
							},
						},
						type: "function",
					}) as ChatCompletionTool,
			);

			try {
				const systemMessage: ChatCompletionMessageParam = {
					role: "system",
					content: systemMessagePrompt,
				};

				setBusy(true);
				const chatCompletion =
					await openAIClient.chat.completions.create({
						messages: [systemMessage, ...openAIChatHistory],
						model: (selectedLLM as OpenAI_LLM).modelId,
						tool_choice: "auto",
						tools: tools,
						parallel_tool_calls: false,
					});

				if (chatCompletion.choices[0].message.content) {
					// if content[0] is text, then it is a text completion
					// we can return directly
					addMessage({
						message: chatCompletion.choices[0].message.content!,
						sender: llmName,
						fromUser: false,
						avatar: <Bot className="w-10 h-10 rounded-full" />,
						type: "text",
					});
				} else {
					// otherwise, it's a tool call
					// we need to invoke the tool
					const tool =
						chatCompletion.choices[0].message.tool_calls![0];
					const toolName = tool.function.name;
					const argumentJson = tool.function.arguments;
					const step = steps.find((s) => s.name === toolName);

					// arguments is an object with keys as the parameter names and values as the parameter values
					// we need to convert this to an array of VariableDTO
					const argumentObject = JSON.parse(argumentJson);
					const stepParameters = steps.find(
						(s) => s.name === toolName,
					)?.parameters;
					const argumentsArray = Object.keys(argumentObject)
						.map((key) => {
							const parameter = stepParameters?.find(
								(p) => p.variable_name === key,
							);
							if (!parameter) {
								return undefined;
							}
							return {
								result: {
									name: key,
									displayValue: JSON.stringify(
										argumentObject[key],
									),
									type: parameter.parameter_type,
									value: argumentObject[key],
									generation: 0,
								} as VariableDTO,
								generation: 0,
							} as StepRunDTO;
						})
						.filter((v) => v !== undefined);

					console.log(argumentsArray);

					// merge the arguments with the context variables
					// and override the context variables with the arguments
					const mergedVariables = contextVariables.filter(
						(v) =>
							!argumentsArray.find(
								(a) => a.result?.name === v.result?.name,
							),
					);
					// add tool message
					let toolMessage: ChatTool = {
						type: "tool",
						id: tool.id,
						name: toolName,
						argument: argumentJson,
						displayValue: "",
						values: [],
						isExecuting: true,
					};
					addMessage(toolMessage);
					const newStepRunHistory = await executeStep(step, [
						...mergedVariables,
						...argumentsArray,
					]);

					if (newStepRunHistory.length > 0) {
						const values = newStepRunHistory
							.filter(
								(v) =>
									v.result !== undefined &&
									v.status === "Completed",
							)
							.map(
								(v) =>
									`${v.result?.name}: ${v.result?.displayValue}`,
							)
							.join("\n");

						toolMessage.isExecuting = false;
						toolMessage.displayValue = values;
						toolMessage.values = newStepRunHistory
							.filter(
								(v) =>
									v.result !== undefined &&
									v.status === "Completed",
							)
							.map((v) => v.result!);

						await sendMessage(
							"",
							workflow,
							[...stepRunHistory, ...newStepRunHistory!],
							[...chatHistory, toolMessage],
						);
					}
				}
			} catch (error) {
				toast.error(JSON.stringify(error));
				return;
			} finally {
				setBusy(false);
			}
		}

		// if (claudeLLMs.find((f) => f === selectedLLM) && claudeApiKey) {
		// 	const claudeClient = new Anthropic({
		// 		apiKey: claudeApiKey,
		// 		dangerouslyAllowBrowser: true,
		// 	});

		// 	const claudeChatHistory: MessageParam[] = [
		// 		...chatHistory,
		// 		userMessage,
		// 	].map((msg) => {
		// 		if (msg.fromUser) {
		// 			return {
		// 				role: "user",
		// 				content: msg.message,
		// 			} as MessageParam;
		// 		} else {
		// 			return {
		// 				role: "assistant",
		// 				content: msg.message,
		// 			} as MessageParam;
		// 		}
		// 	});

		// 	try {
		// 		setBusy(true);
		// 		const chatCompletion = await claudeClient.messages.create({
		// 			model: selectedLLM as Model,
		// 			messages: claudeChatHistory,
		// 			max_tokens: 1024,
		// 			system: systemMessagePrompt,
		// 		});
		// 		console.log(chatCompletion);
		// 		// if content[0] is text, then it is a text completion
		// 		if (chatCompletion.content[0].type === "text") {
		// 			addMessage({
		// 				message: (chatCompletion.content[0] as TextBlock).text,
		// 				sender: llmName,
		// 				fromUser: false,
		// 				avatar: (
		// 					<Image
		// 						src={StepWiseIcon}
		// 						alt="avatar"
		// 						className="w-10 h-10 rounded-full"
		// 					/>
		// 				),
		// 			});
		// 		}
		// 	} catch (error) {
		// 		toast.error(JSON.stringify(error));
		// 	} finally {
		// 		setBusy(false);
		// 	}
		// }
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.ctrlKey && event.key === "Enter") {
			event.preventDefault();
			if (!busy && message.trim() !== "") {
				sendMessage(
					message,
					selectedWorkflow!,
					selectedStepRunHistory,
					chatHistory,
				);
			}
		}
	};

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [busy, message, selectedWorkflow, selectedStepRunHistory, chatHistory]);

	return (
		<div className="flex items-center justify-end w-full">
			<div className="flex grow">
				<LLMSelector />
			</div>
			{busy && <Loader2 className="h-4 w-4 animate-spin" />}
			<Button
				variant={"default"}
				size={"smallIcon"}
				onClick={() =>
					sendMessage(
						message,
						selectedWorkflow!,
						selectedStepRunHistory,
						chatHistory,
					)
				}
				disabled={busy || message === "" || selectedLLM === undefined}
				tooltip="Send message (Ctrl + Enter)"
			>
				<SendHorizonal />
			</Button>
		</div>
	);
};

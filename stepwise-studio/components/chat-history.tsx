import { create } from "zustand";
import { Markdown } from "./markdown";
import {
	Bot,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Loader2,
	RotateCcw,
	SquareFunction,
	X,
} from "lucide-react";
import { Button } from "./ui/button";
import React from "react";
import { useWorkflowStore } from "@/hooks/useWorkflow";
import { stat } from "fs";
import { VariableDTO } from "@/stepwise-client";
import { VariableCard } from "./variable-card";

export type ChatMessageType = "text" | "tool";

export interface ChatMessage {
	message: string;
	sender?: string;
	avatar?: string | React.ReactNode;
	fromUser: boolean;
	type: "text";
}

export interface ChatTool {
	type: "tool";
	id?: string;
	name: string;
	arguments: string;
	displayValue: string;
	values?: VariableDTO[];
	isExecuting: boolean; // whether the tool is currently executing
}

export type ChatMessageContent = ChatMessage | ChatTool;

export interface ChatHistoriesState {
	chatHistories: { [key: string]: ChatMessageContent[] };
	updateChatHistory: (key: string, value: ChatMessageContent[]) => void;
}

export interface ChatHistoryState {
	messages: ChatMessageContent[];
	setMessages: (messages: ChatMessageContent[]) => void;
	addMessage: (message: ChatMessageContent) => void;
	deleteMessage: (index: number) => void;
	deleteMessageAfter: (index: number) => void;
}

export const useChatHistoriesStore = create<ChatHistoriesState>((set, get) => ({
	chatHistories: {},
	updateChatHistory: (key, value) =>
		set({
			chatHistories: { ...get().chatHistories, [key]: value },
		}),
}));

export const useChatHistoryStore = create<ChatHistoryState>((set) => ({
	setMessages: (messages) =>
		set(() => ({
			messages,
		})),
	messages: [],
	addMessage: (message) =>
		set((state) => ({
			messages: [...state.messages, message],
		})),
	deleteMessage: (index) =>
		set((state) => ({
			messages: state.messages.filter((_, i) => i !== index),
		})),
	deleteMessageAfter: (index) =>
		set((state) => ({
			messages: state.messages.filter((_, i) => i < index),
		})),
}));

export const ChatMessageCard: React.FC<ChatMessage & { index: number }> = ({
	message,
	sender,
	avatar,
	index,
}) => {
	const deleteMessageAfter = useChatHistoryStore(
		(state) => state.deleteMessageAfter,
	);
	return (
		<div className="flex flex-col w-full gap-1 group">
			<div className="flex items-center w-full relative ">
				<div className="flex items-center gap-2">
					{avatar && typeof avatar === "string" && (
						<img
							src={avatar}
							alt="avatar"
							className="w-10 h-10 rounded-full"
						/>
					)}
					{avatar && typeof avatar !== "string" && avatar}
					{sender && <span className="font-bold">{sender}</span>}
				</div>
				{/* add x button */}
				<Button
					size="tinyIcon"
					onClick={() => deleteMessageAfter(index)}
					className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<X />
				</Button>
			</div>
			<Markdown className="p-0">{message}</Markdown>
		</div>
	);
};

export const ChatToolCard: React.FC<ChatTool> = ({
	name,
	displayValue,
	values,
	isExecuting,
}) => {
	const [collapsed, setCollapsed] = React.useState(true);
	const [executing, setExecuting] = React.useState(isExecuting);

	React.useEffect(() => {
		setExecuting(isExecuting);
	}, [isExecuting]);
	return (
		<div className="flex flex-col w-full gap-1">
			<div
				className="flex items-center gap-2"
				onClick={() => setCollapsed(!collapsed)}
			>
				{executing && (
					<Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
				)}
				{!executing && (
					<CheckCircle2 className="h-5 w-5 text-green-500" />
				)}
				<span className="font-bold grow">{name}</span>
				{collapsed ? (
					<ChevronDown className="h-5 w-5 text-gray-500" />
				) : (
					<ChevronUp className="h-5 w-5 text-gray-500" />
				)}
			</div>
			{!collapsed && values && (
				<div className="flex flex-col justify-between bg-accent p-2 rounded-lg overflow-x-auto">
					{values.map((value, index) => (
						<VariableCard key={index} variable={value} />
					))}
				</div>
			)}
		</div>
	);
};
export const ChatHistory: React.FC = () => {
	const messages = useChatHistoryStore((state) => state.messages);
	const setMessages = useChatHistoryStore((state) => state.setMessages);
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const chatHistories = useChatHistoriesStore((state) => state.chatHistories);
	const updateChatHistory = useChatHistoriesStore(
		(state) => state.updateChatHistory,
	);

	React.useEffect(() => {
		if (selectedWorkflow) {
			if (!chatHistories[selectedWorkflow.name]) {
				setMessages([]);
			} else {
				setMessages(chatHistories[selectedWorkflow.name]);
			}
		}
	}, [selectedWorkflow]);

	React.useEffect(() => {
		if (selectedWorkflow) {
			updateChatHistory(selectedWorkflow.name, messages);
		}
	}, [messages]);

	return (
		<div className="gap-2 border-b-2 flex flex-col h-full overflow-y-auto">
			{messages.length > 0 &&
				messages.map((message, index) => (
					<div key={index}>
						{message.type === "text" && (
							<ChatMessageCard {...message} index={index} />
						)}

						{message.type === "tool" && (
							<ChatToolCard {...message} />
						)}
					</div>
				))}
			{messages.length === 0 && (
				<div className="flex flex-col grow items-center justify-center text-muted-foreground">
					<Bot className="h-20 w-20" />
					<span className="text-4xl font-bold">Ask Geeno</span>
					<span className="text-lg text-center">
						Geeno is here to help you with your workflow
					</span>
					<span className="text-lg text-center">
						To get start with Geeno, select LLM from LLM selector
						and ask a question.
					</span>
				</div>
			)}
		</div>
	);
};

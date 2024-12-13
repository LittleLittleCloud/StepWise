import { create } from "zustand";
import { Markdown } from "./markdown";
import { ChevronDown, ChevronUp, SquareFunction, X } from "lucide-react";
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
	messages: [
		{
			id: "123",
			name: "shit",
			displayValue: "fuck",
			type: "tool",
		} as ChatTool,
	],
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
}) => {
	const [collapsed, setCollapsed] = React.useState(true);
	return (
		<div className="flex flex-col w-full gap-1">
			<div
				className="flex items-center gap-2"
				onClick={() => setCollapsed(!collapsed)}
			>
				<SquareFunction className="h-5 w-5 text-gray-500" />
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
		<div className="flex flex-col gap-2">
			{messages.map((message, index) => (
				<div key={index} className="flex gap-2">
					{message.type === "text" && (
						<ChatMessageCard {...message} index={index} />
					)}

					{message.type === "tool" && <ChatToolCard {...message} />}
				</div>
			))}
		</div>
	);
};

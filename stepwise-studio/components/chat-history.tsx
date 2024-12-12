import { create } from "zustand";
import { Markdown } from "./markdown";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import React from "react";

export interface ChatMessage {
	message: string;
	sender?: string;
	avatar?: string | React.ReactNode;
	fromUser: boolean;
}

export interface ChatHistoryState {
	messages: ChatMessage[];
	addMessage: (message: ChatMessage) => void;
	deleteMessage: (index: number) => void;
	deleteMessageAfter: (index: number) => void;
}

export const useChatHistoryStore = create<ChatHistoryState>((set) => ({
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

export const ChatHistory: React.FC = () => {
	const messages = useChatHistoryStore((state) => state.messages);

	return (
		<div className="flex flex-col gap-2">
			{messages.map((message, index) => (
				<div key={index} className="flex gap-2">
					<ChatMessageCard {...message} index={index} />
				</div>
			))}
		</div>
	);
};

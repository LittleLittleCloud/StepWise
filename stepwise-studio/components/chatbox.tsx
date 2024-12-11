import { stat } from "fs";
import { Textarea } from "./ui/textarea";
import { create } from "zustand";
import { useChatHistoryStore } from "./chat-history";
import { useAuth0 } from "@auth0/auth0-react";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";

export interface ChatBoxState {
	message: string;
	setMessage: (message: string | ((prev: string) => string)) => void;
}

export const useChatBoxStore = create<ChatBoxState>((set) => ({
	message: "",
	setMessage: (message) =>
		set((state) => ({
			message:
				typeof message === "function"
					? message(state.message)
					: message,
		})),
}));

export const ChatBox: React.FC = () => {
	const message = useChatBoxStore((state) => state.message);
	const setMessage = useChatBoxStore((state) => state.setMessage);

	return (
		<Textarea
			placeholder="Type a message..."
			value={message}
			onChange={(e) => setMessage(e.target.value)}
		/>
	);
};

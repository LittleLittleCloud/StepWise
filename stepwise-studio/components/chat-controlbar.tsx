import { SendHorizonal } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { useChatBoxStore } from "./chatbox";
import { useChatHistoryStore } from "./chat-history";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";

export const ChatControlBar: React.FC = () => {
	const message = useChatBoxStore((state) => state.message);
	const setMessage = useChatBoxStore((state) => state.setMessage);
	const addMessage = useChatHistoryStore((state) => state.addMessage);
	const configuration = useStepwiseServerConfiguration();
	const { user } = useAuth0();
	const sendMessage = () => {
		if (configuration?.enableAuth0Authentication) {
			addMessage({
				message,
				sender: user?.name,
				avatar: user?.picture,
			});
		} else {
			addMessage({
				message,
			});
		}

		setMessage("");
	};
	return (
		<div className="flex justify-end w-full">
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

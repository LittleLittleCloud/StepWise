import { Loader2, SendHorizonal } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { useChatBoxStore } from "./chatbox";
import { useChatHistoryStore } from "./chat-history";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { LLMSelector, useLLMSelectorStore } from "./llm-selector";
import { useOpenAIConfiguration } from "./openai-configure-card";
import OpenAI from "openai";
import Image from "next/image";
import { toast } from "sonner";

export const ChatControlBar: React.FC = () => {
	const message = useChatBoxStore((state) => state.message);
	const chatHistory = useChatHistoryStore((state) => state.messages);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const openAIApiKey = useOpenAIConfiguration((state) => state.apiKey);
	const setMessage = useChatBoxStore((state) => state.setMessage);
	const addMessage = useChatHistoryStore((state) => state.addMessage);
	const configuration = useStepwiseServerConfiguration();
	const [busy, setBusy] = React.useState(false);
	const { user } = useAuth0();
	const sendMessage = async () => {
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

		if (
			selectedLLM === "gpt-4o" ||
			selectedLLM === "gpt-3.5-turbo" ||
			(selectedLLM === "gpt-4" && openAIApiKey)
		) {
			const openAIClient = new OpenAI({
				apiKey: openAIApiKey,
				dangerouslyAllowBrowser: true,
			});

			const openAIChatHistory = chatHistory.map((msg) => {
				// role
			});
			try {
				setBusy(true);
				const chatCompletion =
					await openAIClient.chat.completions.create({
						messages: [
							{ role: "user", content: "Say this is a test" },
						],
						model: selectedLLM,
					});
				console.log(chatCompletion);
				addMessage({
					message: chatCompletion.choices[0].message.content!,
					sender: selectedLLM,
					avatar: (
						<Image
							src="/openai-logo.png"
							alt="OpenAI"
							width={50}
							height={50}
						/>
					),
				});
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

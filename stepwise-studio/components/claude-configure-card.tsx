import { EyeOff, Eye, Key } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "./ui/card";
import { Input } from "./ui/input";
import { create } from "zustand";
import { toast } from "sonner";
import { LLMType, useLLMSelectorStore } from "./llm-selector";

export interface ClaudeConfigurationState {
	apiKey?: string;
	setApiKey: (apiKey: string) => void;
	readApiKeyFromStorage: () => void;
	saveApiKeyToStorage: () => void;
	removeApiKeyFromStorage: () => void;
	clearApiKey: () => void;
	LLMTypes: LLMType[];
}

export const useClaudeConfiguration = create<ClaudeConfigurationState>(
	(set, get) => ({
		apiKey: undefined,
		setApiKey: (apiKey: string) =>  {
			get().LLMTypes.forEach((llm) => {
				useLLMSelectorStore.getState().addLLM(llm);
			});
			set({ apiKey });
		},
		readApiKeyFromStorage: () => {
			const apiKey = localStorage.getItem("stepwise-claude-api-key");
			if (apiKey) {
				get().setApiKey(apiKey);
			}
		},
		removeApiKeyFromStorage: () => {
			localStorage.removeItem("stepwise-claude-api-key");
		},
		saveApiKeyToStorage: () => {
			if (get().apiKey) {
				localStorage.setItem("stepwise-claude-api-key", get().apiKey!);
			}
		},
		clearApiKey: () => {
			get().LLMTypes.forEach((llm) => {
				useLLMSelectorStore.getState().deleteLLM(llm);
			});
			set({ apiKey: undefined });
		},
		LLMTypes: [
			"claude-3-5-haiku-latest",
			"claude-3-5-sonnet-latest",
			"claude-3-opus-latest",
		],
	}),
);

export const ClaudeConfigCard: React.FC = () => {
	const { apiKey, setApiKey, saveApiKeyToStorage, clearApiKey, removeApiKeyFromStorage } =
		useClaudeConfiguration();
	const [showKey, setShowKey] = useState(false);

	const handleSave = async () => {
		if (!apiKey) {
			// clear the API key
			clearApiKey();
			removeApiKeyFromStorage();
			toast.info("Claude API key cleared");
		} else {
			// Save the API key to local storage
			saveApiKeyToStorage();
			setApiKey(apiKey);
			toast.success("Claude API key saved successfully");
		}
	};

	return (
		<div>
			<Card className="max-w-80">
				<CardHeader>
					<CardTitle className="text-2xl">
						Claude Configuration
					</CardTitle>
					<CardDescription>
						Enter your Claude API key to enable AI features. Your
						API key is encrypted and stored securely.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="relative">
						<Input
							type={showKey ? "text" : "password"}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="Enter your Claude API key"
							className="pr-10"
						/>
						<Button
							onClick={() => setShowKey(!showKey)}
							className="absolute right-3 top-1/2 -translate-y-1/2"
						>
							{showKey ? <EyeOff size={16} /> : <Eye size={16} />}
						</Button>
					</div>

					<div className="text-sm text-gray-500 flex items-center gap-2">
						<Key size={14} />
						<span>Find your API key in the Claude dashboard</span>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end gap-3">
					<Button variant="outline" onClick={() => setApiKey("")}>
						Clear
					</Button>
					<Button onClick={handleSave}>Save Configuration</Button>
				</CardFooter>
			</Card>
		</div>
	);
};

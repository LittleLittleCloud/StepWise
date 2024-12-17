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
import { LLM, LLMType, OpenAI_LLM, useLLMSelectorStore } from "./llm-selector";

export interface OpenAIConfigurationState {
	apiKey?: string;
	setApiKey: (apiKey: string) => void;
	LLMs: OpenAI_LLM[];
}

export const useOpenAIConfiguration = create<OpenAIConfigurationState>(
	(set, get) => ({
		apiKey: undefined,
		setApiKey: (apiKey: string) => {
			set({ apiKey });
		},
		LLMs: [
			{
				modelId: "gpt-4o",
				name: "gpt-4o",
				type: "OpenAI",
			},
			{
				modelId: "gpt-4",
				name: "gpt-4",
				type: "OpenAI",
			},
			{
				modelId: "gpt-3.5-turbo",
				name: "gpt-3.5-turbo",
				type: "OpenAI",
			},
		],
		removeApiKeyFromStorage: () => {
			localStorage.removeItem("stepwise-openai-api-key");
		},
	}),
);

export const OpenAIConfigCard: React.FC = () => {
	const { apiKey, setApiKey, LLMs } = useOpenAIConfiguration();

	const {
		addOrUpdateLLM,
		deleteLLM,
		availableLLMs,
		saveAvailableLLMsToStorage,
		loadAvailableLLMsFromStorage,
	} = useLLMSelectorStore();

	const [showKey, setShowKey] = useState(false);

	useEffect(() => {
		const firstOpenAI = availableLLMs.find((llm) => llm.type === "OpenAI");
		if (firstOpenAI && (firstOpenAI as OpenAI_LLM).apiKey) {
			setApiKey((firstOpenAI as OpenAI_LLM).apiKey!);
		}
	}, [availableLLMs]);

	const handleSave = async () => {
		if (!apiKey) {
			const llmsToRemove = availableLLMs.filter(
				(llm) => llm.type === "OpenAI",
			);
			llmsToRemove.forEach((llm) => {
				deleteLLM(llm);
			});

			saveAvailableLLMsToStorage();
			toast.info("OpenAI API key cleared");
			return;
		} else {
			const llmsToAdd = LLMs.map((llm) => {
				return { ...llm, apiKey: apiKey } as OpenAI_LLM;
			});

			llmsToAdd.forEach((llm) => {
				addOrUpdateLLM(llm);
			});

			saveAvailableLLMsToStorage();
			toast.success("OpenAI API key saved successfully");
		}
	};

	return (
		<div>
			<Card className="max-w-80">
				<CardHeader>
					<CardTitle className="text-2xl">
						OpenAI Configuration
					</CardTitle>
					<CardDescription>
						Enter your OpenAI API key to enable AI features. Your
						API key is encrypted and stored securely.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="relative">
						<Input
							type={showKey ? "text" : "password"}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="Enter your OpenAI API key"
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
						<span>Find your API key in the OpenAI dashboard</span>
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

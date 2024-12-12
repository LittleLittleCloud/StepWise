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

export interface OpenAIConfigurationState {
	apiKey?: string;
	setApiKey: (apiKey: string) => void;
	readApiKeyFromStorage: () => void;
	saveApiKeyToStorage: () => void;
}

export const useOpenAIConfiguration = create<OpenAIConfigurationState>(
	(set, get) => ({
		apiKey: undefined,
		setApiKey: (apiKey: string) => set({ apiKey }),
		readApiKeyFromStorage: () => {
			const apiKey = localStorage.getItem("stepwise-openai-api-key");
			if (apiKey) {
				set({ apiKey });
			}
		},
		saveApiKeyToStorage: () => {
			if (get().apiKey) {
				localStorage.setItem("stepwise-openai-api-key", get().apiKey!);
			}
		},
	}),
);

export const OpenAIConfigCard: React.FC = () => {
	const { apiKey, setApiKey, saveApiKeyToStorage } = useOpenAIConfiguration();

	const [showKey, setShowKey] = useState(false);

	const handleSave = async () => {
		if (!apiKey) {
			return;
		}

		// Save the API key to local storage
		saveApiKeyToStorage();
		toast.success("OpenAI API key saved successfully");
	};

	return (
		<div>
			<Card className="max-w-128">
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

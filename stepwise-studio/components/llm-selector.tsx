import React, { useEffect } from "react";
import { create } from "zustand";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { useOpenAIConfiguration } from "./openai-configure-card";
import { useClaudeConfiguration } from "./claude-configure-card";
import { Model } from "@anthropic-ai/sdk/resources/messages.mjs";
import { ChatModel } from "openai/resources/index.mjs";
export type LLMType = ChatModel | Model;

export interface LLMState {
	availableLLMs: Set<LLMType>;
	selectedLLM?: LLMType;
	selectLLM: (llm: LLMType) => void;
	addLLM: (llm: LLMType) => void;
	deleteLLM: (llm: LLMType) => void;
	clearSelectedLLM: () => void;
}

export const useLLMSelectorStore = create<LLMState>((set) => ({
	availableLLMs: new Set<LLMType>([]),
	selectedLLM: undefined,
	selectLLM: (llm) => set(() => ({ selectedLLM: llm })),
	addLLM: (llm) =>
		set((state) => {
			state.availableLLMs.add(llm);
			return { availableLLMs: state.availableLLMs };
		}),
	loadLLMs: () => {},
	clearSelectedLLM: () => set(() => ({ selectedLLM: undefined })),
	deleteLLM: (llm) =>
		set((state) => {
			state.availableLLMs.delete(llm);
			return { availableLLMs: state.availableLLMs };
		}),
}));

export const LLMSelector: React.FC = () => {
	const availableLLMs = useLLMSelectorStore((state) => state.availableLLMs);
	const openaiApi = useOpenAIConfiguration((state) => state.apiKey);
	const selectLLM = useLLMSelectorStore((state) => state.selectLLM);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const clearSelectedLLM = useLLMSelectorStore(
		(state) => state.clearSelectedLLM,
	);

	useEffect(() => {
		if (selectedLLM === undefined && availableLLMs.size > 0) {
			selectLLM(availableLLMs.values().next().value as LLMType);
		}
	}, [availableLLMs]);

	return availableLLMs.size === 0 ? (
		<div className="flex flex-col items-center gap-1">
			<p>No LLMs available</p>
		</div>
	) : (
		<div className="flex items-center gap-1">
			<Select
				defaultValue={availableLLMs.values().next().value}
				onValueChange={(value) => {
					console.log(value);
					selectLLM(value as LLMType);
				}}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{Array.from(availableLLMs).map((llm) => (
						<SelectItem value={llm}>{llm}</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};

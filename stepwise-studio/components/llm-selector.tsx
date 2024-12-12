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
export type LLMType =
	| "gpt-4o"
	| "gpt-3.5-turbo"
	| "gpt-4"
	| Model;

export interface LLMState {
	availableLLMs: Set<LLMType>;
	selectedLLM?: LLMType;
	selectLLM: (llm: LLMType) => void;
	addLLM: (llm: LLMType) => void;
	clearSelectedLLM: () => void;
}

export const useLLMSelectorStore = create<LLMState>((set) => ({
	availableLLMs: new Set<LLMType>([]),
	selectedLLM: undefined,
	selectLLM: (llm) => set(() => ({ selectedLLM: llm })),
	addLLM: (llm) =>
		set((state) => ({ availableLLMs: state.availableLLMs.add(llm) })),
	loadLLMs: () => {},
	clearSelectedLLM: () => set(() => ({ selectedLLM: undefined })),
}));

export const LLMSelector: React.FC = () => {
	const availableLLMs = useLLMSelectorStore((state) => state.availableLLMs);
	const openaiApi = useOpenAIConfiguration((state) => state.apiKey);
	const claudeApi = useClaudeConfiguration((state) => state.apiKey);
	const selectLLM = useLLMSelectorStore((state) => state.selectLLM);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const clearSelectedLLM = useLLMSelectorStore(
		(state) => state.clearSelectedLLM,
	);

	useEffect(() => {
		const openaiLLM: LLMType[] = ["gpt-4o", "gpt-3.5-turbo", "gpt-4"];
		if (openaiApi) {
			openaiLLM.forEach((llm) => {
				useLLMSelectorStore.getState().addLLM(llm);
			});

			if (selectedLLM === undefined) {
				selectLLM("gpt-4o");
			}
		} else {
			// clear openai LLMs
			openaiLLM.forEach((llm) => {
				useLLMSelectorStore.getState().availableLLMs.delete(llm);
			});

			if (openaiLLM.find((llm) => llm === selectedLLM)) {
				clearSelectedLLM();
			}
		}
	}, [openaiApi, selectedLLM]);

	useEffect(() => {
		const claudeLLM: LLMType[] = [
			"claude-3-5-haiku-latest",
			"claude-3-5-sonnet-latest",
			"claude-3-opus-latest",
		];
		if (claudeApi) {
			claudeLLM.forEach((llm) => {
				useLLMSelectorStore.getState().addLLM(llm);
			});

			if (selectedLLM === undefined) {
				selectLLM("claude-3.5-sonnet");
			}
		} else {
			// clear claude LLMs
			claudeLLM.forEach((llm) => {
				useLLMSelectorStore.getState().availableLLMs.delete(llm);
			});

			if (claudeLLM.find((llm) => llm === selectedLLM)) {
				clearSelectedLLM();
			}
		}
	}, [claudeApi, selectedLLM]);

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

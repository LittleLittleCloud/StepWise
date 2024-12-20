import React, { useEffect } from "react";
import { create } from "zustand";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Model } from "@anthropic-ai/sdk/resources/messages.mjs";
import { ChatModel } from "openai/resources/index.mjs";
import { toast } from "sonner";
export type LLM = {
	name: string; // should be identical.
	type: LLMType;
};

export interface AOAI_LLM extends LLM {
	type: "AOAI";
	apiKey: string;
	endPoint: string;
	deployName: string;
}

export interface OpenAI_LLM extends LLM {
	type: "OpenAI";
	apiKey?: string;
	modelId: ChatModel;
}

export type LLMType = ChatModel | Model | "AOAI" | "OpenAI";

export interface LLMState {
	availableLLMs: LLM[];
	selectedLLM?: LLM;
	selectLLM: (llm: LLM) => void;
	addOrUpdateLLM: (llm: LLM) => void;
	deleteLLM: (llm: LLM) => void;
	clearSelectedLLM: () => void;
	saveAvailableLLMsToStorage: () => void;
	loadAvailableLLMsFromStorage: () => void;
}

export const useLLMSelectorStore = create<LLMState>((set, get) => ({
	availableLLMs: [],
	selectedLLM: undefined,
	selectLLM: (llm) => set(() => ({ selectedLLM: llm })),
	addOrUpdateLLM: (llmToAdd) =>
		set((state) => {
			const llms = state.availableLLMs.filter(
				(llm) =>
					llm.name !== llmToAdd.name || llm.type !== llmToAdd.type,
			);

			toast.success("LLM added!");

			if (
				state.selectedLLM?.name === llmToAdd.name &&
				state.selectedLLM?.type === llmToAdd.type
			) {
				set({ selectedLLM: llmToAdd });
			}

			return { availableLLMs: [...llms, llmToAdd] };
		}),
	clearSelectedLLM: () => set(() => ({ selectedLLM: undefined })),
	deleteLLM: (llmToRemove) =>
		set((state) => {
			const index = state.availableLLMs.findIndex(
				(llm) =>
					llmToRemove.type === llm.type &&
					llmToRemove.name === llm.name,
			);
			if (index !== -1) {
				state.availableLLMs.splice(index, 1);
			}

			return { availableLLMs: [...state.availableLLMs] };
		}),
	saveAvailableLLMsToStorage: () => {
		const llms = JSON.stringify(
			useLLMSelectorStore.getState().availableLLMs,
		);
		localStorage.setItem("stepwise-llms", llms);
	},
	loadAvailableLLMsFromStorage: () => {
		const llms = localStorage.getItem("stepwise-llms");
		if (llms) {
			set({ availableLLMs: JSON.parse(llms) });
		}
	},
}));

export const LLMSelector: React.FC = () => {
	const availableLLMs = useLLMSelectorStore((state) => state.availableLLMs);
	const selectLLM = useLLMSelectorStore((state) => state.selectLLM);
	const selectedLLM = useLLMSelectorStore((state) => state.selectedLLM);
	const clearSelectedLLM = useLLMSelectorStore(
		(state) => state.clearSelectedLLM,
	);

	useEffect(() => {
		if (selectedLLM === undefined && availableLLMs.length > 0) {
			selectLLM(availableLLMs[0]);
		}

		if (availableLLMs.length === 0) {
			clearSelectedLLM();
		}
	}, [availableLLMs]);

	return availableLLMs.length === 0 || selectedLLM === undefined ? (
		<div className="flex flex-col items-center gap-1">
			<p>No LLMs available</p>
		</div>
	) : (
		<div className="flex items-center gap-1">
			<Select
				defaultValue={selectedLLM.name}
				onValueChange={(value) => {
					const llm = availableLLMs.find((llm) => llm.name === value);
					selectLLM(llm!);
				}}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{Array.from(availableLLMs).map((llm) => (
						<SelectItem key={llm.name} value={llm.name}>
							{llm.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};

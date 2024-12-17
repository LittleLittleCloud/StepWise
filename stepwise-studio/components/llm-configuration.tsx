import { ClaudeConfigCard } from "./claude-configure-card";
import { useLLMSelectorStore } from "./llm-selector";
import { OpenAIConfigCard } from "./openai-configure-card";

export const LLMConfiguration: React.FC = () => {
	const availableLLMs = useLLMSelectorStore((state) => state.availableLLMs);
	return (
		<div className="flex flex-wrap p-10 gap-10 overflow-y-auto">
			<OpenAIConfigCard />
			{availableLLMs.map((llm) => {
				if (llm.type === "AOAI") {
					return <ClaudeConfigCard key={llm.name} />;
				}
			})}
		</div>
	);
};

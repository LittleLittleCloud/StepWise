import { ClaudeConfigCard } from "./claude-configure-card";
import { OpenAIConfigCard } from "./openai-configure-card";

export const LLMConfiguration: React.FC = () => {
	return (
		<div className="flex flex-wrap p-10 gap-10 overflow-y-auto">
			<OpenAIConfigCard />
		</div>
	);
};

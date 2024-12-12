import { OpenAIConfigCard } from "./openai-configure-card";

export const LLMConfiguration: React.FC = () => {
	return (
		<div className="flex flex-wrap p-10 gap-12 h-screen">
			<OpenAIConfigCard />
		</div>
	);
};

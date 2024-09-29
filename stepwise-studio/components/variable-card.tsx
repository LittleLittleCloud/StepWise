import { getDisplayType, showAsMarkdown } from "@/lib/utils";
import { VariableDTO } from "@/stepwise-client";
import { useState, useEffect } from "react";
import { Markdown } from "./markdown";

export interface VariableCardProps {
	variable: VariableDTO;
}

export const VariableCard: React.FC<VariableCardProps> = (props) => {
	const [variable, setVariable] = useState<VariableDTO>(props.variable);

	useEffect(() => {
		setVariable(props.variable);
	}, [props.variable]);

	return (
		<div>
			{showAsMarkdown(getDisplayType(variable.type ?? "")) && (
				<div className="flex flex-col gap-1 bg-background/50 rounded p-1">
					<Markdown className="text-xs w-full overflow-x-auto">
						{variable.displayValue!}
					</Markdown>
				</div>
			)}
		</div>
	);
};

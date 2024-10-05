import { getDisplayType, showAsMarkdown } from "@/lib/utils";
import { client, StepWiseImage, VariableDTO } from "@/stepwise-client";
import { useState, useEffect } from "react";
import { Markdown } from "./markdown";

export interface VariableCardProps {
	variable: VariableDTO;
}

export const VariableCard: React.FC<VariableCardProps> = (props) => {
	const [variable, setVariable] = useState<VariableDTO>(props.variable);
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

	useEffect(() => {
		if (variable.type === "StepWiseImage") {
			const image = variable.value as StepWiseImage;
			if (image.url) {
				console.log("Setting preview image URL:", image.url);
				var baseAddress = client.getConfig().baseUrl;
				setPreviewImageUrl(`${baseAddress}${image.url}`);
			}
		}
	}, [variable]);

	useEffect(() => {
		setVariable(props.variable);
	}, [props.variable]);

	return (
		<div>
			{showAsMarkdown(getDisplayType(variable.type)) && (
				<div className="flex flex-col gap-1 bg-background/50 rounded p-1">
					<Markdown className="text-xs w-full overflow-x-auto">
						{variable.displayValue!}
					</Markdown>
				</div>
			)}

			{variable.type === "StepWiseImage" && previewImageUrl && (
				<img
					src={previewImageUrl}
					alt="Preview"
					className="w-full rounded-lg"
				/>
			)}
		</div>
	);
};

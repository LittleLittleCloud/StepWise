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

				// if url is absolute, use it as is
				if (image.url.startsWith("http")) {
					setPreviewImageUrl(image.url);
				} else {
					// if url is relative, use the base address from the client
					var baseAddress = client.getConfig().baseUrl;
					setPreviewImageUrl(`${baseAddress}${image.url}`);
				}
			}
		}
	}, [variable]);

	useEffect(() => {
		setVariable(props.variable);
	}, [props.variable]);

	return (
		<div className="bg-transparent items-center flex flex-col gap-1 rounded-md p-1 ">
			{variable.type !== "StepWiseImage" && variable.displayValue && (
				<div className="w-full overflow-x-auto">
					<Markdown>{variable.displayValue}</Markdown>
				</div>
			)}

			{variable.type === "StepWiseImage" && previewImageUrl && (
				<img
					src={previewImageUrl}
					alt="Preview"
					className="rounded-lg max-h-48"
				/>
			)}
		</div>
	);
};

import { getDisplayType, showAsMarkdown } from "@/lib/utils";
import { client, StepWiseImage, VariableDTO } from "@/stepwise-client";
import { useState, useEffect } from "react";
import { Markdown } from "./markdown";
import { CopyToClipboardIcon } from "./copy-to-clipboard-icon";
import Divider from "./divider";

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
		<div className="bg-transparent items-center flex flex-col gap-1 ">
			{variable.type !== "StepWiseImage" && variable.displayValue && (
				<div className="flex flex-col bg-accent gap-1 w-full">
					<div className="w-full bg-background rounded-md overflow-x-auto">
						<Markdown>{variable.displayValue}</Markdown>
					</div>
					<div className="w-full px-1 flex justify-end">
						<CopyToClipboardIcon
							size={12}
							textValue={variable.displayValue}
						/>
					</div>
				</div>
			)}

			{variable.type === "StepWiseImage" && previewImageUrl && (
				<img
					src={previewImageUrl}
					alt="Preview"
					className="rounded-lg max-h-96"
				/>
			)}
		</div>
	);
};

import { cn, getDisplayType, showAsMarkdown } from "@/lib/utils";
import { ParameterDTO, VariableDTO } from "@/stepwise-client";
import { useState, useEffect } from "react";
import { badgeVariants } from "./ui/badge";
import { VariableCard } from "./variable-card";

export type ParameterType =
	| "string"
	| "number"
	| "boolean"
	| "object"
	| "image"
	| "file";

export interface ParameterCardProps extends ParameterDTO {
	variable?: VariableDTO;
}

export const ParameterCard: React.FC<ParameterCardProps> = (props) => {
	const [name, setName] = useState<string>(props.name ?? "");
	const [variable, setVariable] = useState<VariableDTO | undefined>(
		props.variable ?? undefined,
	);
	const [parameterType, setParameterType] = useState<string>(
		props.variable?.type ?? "",
	);
	const [collapsed, setCollapsed] = useState<boolean>(true);

	useEffect(() => {
		setName(props.name ?? "");
		setVariable(props.variable ?? undefined);
		setParameterType(props.parameter_type ?? "");
	}, []);

	useEffect(() => {
		setVariable(props.variable ?? undefined);
	}, [props.variable]);

	return (
		<div
			style={{ userSelect: "text" }}
			className={cn(
				"w-full flex flex-col gap-1 rounded cursor-default px-2 py-1 nodrag nopan ",
			)}
		>
			<div
				className="flex flex-wrap gap-x-5 justify-between hover:cursor-pointer"
				onClick={() => setCollapsed(!collapsed)}
			>
				<div className="flex gap-2 items-center">
					<p>{name}</p>
					{parameterType != "" && (
						<p
							className={cn(
								badgeVariants({
									variant: "green",
									size: "tiny",
								}),
								"px-1 py-0 border truncate flex items-center",
							)}
						>
							{getDisplayType(parameterType)}
						</p>
					)}
				</div>

				{/* the brief display of variable if available */}
				{collapsed &&
					variable &&
					showAsMarkdown(getDisplayType(parameterType)) &&
					variable.displayValue && (
						<span className="truncate bg-background rounded px-1 max-w-[10rem]">
							{variable.displayValue}
						</span>
					)}
			</div>
			{!collapsed && variable &&
			<div className="flex flex-col gap-1 rounded-md bg-background">

			<VariableCard variable={variable} />
			</div>}
		</div>
	);
};

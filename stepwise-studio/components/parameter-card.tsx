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
			className={cn(
				"w-full flex flex-col gap-1 bg-accent rounded px-1 py-0.5 ",
				"hover:bg-accent/80 hover:cursor-pointer",
			)}
			onClick={() => setCollapsed(!collapsed)}
		>
			<div className="flex gap-5 justify-between">
				<div className="flex gap-2 px-4 items-center">
					<div className="text-xs">{name}</div>
					<div
						className={cn(
							badgeVariants({
								variant: "green",
								size: "tiny",
							}),
							"text-xs px-1 border-none truncate",
						)}
					>
						{getDisplayType(parameterType)}
					</div>
				</div>

				{/* the brief display of variable if available */}
				{collapsed &&
					variable &&
					showAsMarkdown(getDisplayType(parameterType)) &&
					variable.displayValue && (
						<span className="text-xs truncate bg-background/50 rounded px-1 max-w-[10rem]">
							{variable.displayValue}
						</span>
					)}
			</div>
			{!collapsed && variable && <VariableCard variable={variable} />}
		</div>
	);
};

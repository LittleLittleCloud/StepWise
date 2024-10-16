import React, { use, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { StepRunDTO, WorkflowDTO } from "@/stepwise-client";
import Workflow from "./workflow";
import ThemeSwitch from "./theme-switch";
import { Icon, Moon, SquareFunction, VariableIcon } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { CircleUserRound } from "lucide-react";
import { Network } from "lucide-react";
import Divider from "./divider";
import { Badge } from "./ui/badge";
import { Markdown } from "./markdown";

export interface StepRunSidebarProps {
	stepRuns: StepRunDTO[];
}

export interface StepRunProps {
	stepRun: StepRunDTO;
}

const StepRunCard: React.FC<StepRunProps> = (props) => {
	const [stepRun, setStepRun] = useState<StepRunDTO>(props.stepRun);

	useEffect(() => {
		setStepRun(props.stepRun);
	}, [props.stepRun]);

	const iconSize = 16;

	return (
		<div className="flex w-full flex-col gap-2 p-2 bg-accent rounded-lg">
			<div className="flex justify-between flex-wrap  gap-2">
				<div className="flex items-center gap-1">
					{stepRun?.step && !stepRun?.result && (
						<SquareFunction size={iconSize} />
					)}
					{stepRun?.result && <VariableIcon size={iconSize} />}
					<span className="text-xs">
						{stepRun?.step?.name ?? stepRun?.result?.name}
					</span>
				</div>

				<div className="flex flex-nowrap gap-2">
					<Badge variant="green" size={"sm"} className="p-1 text-xs">
						{stepRun?.status}
					</Badge>
					{stepRun.result?.type && (
						<Badge
							variant="pink"
							size={"sm"}
							className="p-1 text-xs"
						>
							{stepRun.result?.type}
						</Badge>
					)}
				</div>
			</div>

			{/* display text value if exist */}
			{stepRun.result?.displayValue && (
				<div className="flex flex-col justify-between bg-background rounded-lg px-2 overflow-x-auto">
					<Markdown className="text-xs text-nowarp">
						{stepRun.result?.displayValue}
					</Markdown>
				</div>
			)}
		</div>
	);
};

const StepRunSidebar: React.FC<StepRunSidebarProps> = (props) => {
	const [stepRuns, setStepRuns] = useState<StepRunDTO[]>([]);
	useEffect(() => {
		setStepRuns(props.stepRuns ?? []);
	}, [props.stepRuns]);

	return (
		<div className="flex flex-col h-screen h-max-screen p-4 shadow-xl bg-background rounded-lg overflow-y-auto">
			{/* top bar */}
			<span className="text-x font-bold text-nowrap">StepRun</span>
			{/* stepRuns */}
			<div className="flex flex-col grow mb-4 gap-2">
				<Divider />

				{stepRuns.map((stepRun, index) => (
					<StepRunCard key={index} stepRun={stepRun} />
				))}
			</div>
		</div>
	);
};

export default StepRunSidebar;

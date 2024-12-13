import React, { use, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { StepRunDTO, WorkflowDTO } from "@/stepwise-client";
import Workflow from "./workflow";
import ThemeSwitch from "./theme-switch";
import {
	Bot,
	ChevronDown,
	ChevronUp,
	Clock,
	Icon,
	Loader2,
	Moon,
	SquareFunction,
	VariableIcon,
} from "lucide-react";
import { buttonVariants } from "./ui/button";
import { CircleUserRound } from "lucide-react";
import { Network } from "lucide-react";
import Divider from "./divider";
import { Badge } from "./ui/badge";
import { Markdown } from "./markdown";
import { VariableCard } from "./variable-card";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { StepNodeStatus, ToStepNodeStatus } from "@/lib/stepRunUtils";
import { Textarea } from "./ui/textarea";
import { ChatControlBar } from "./chat-controlbar";
import { ChatBox } from "./chatbox";
import { ChatHistory, useChatHistoryStore } from "./chat-history";
import {
	ChatNavigationTopBar,
	useChatSideBarStore,
} from "./chat-navigation-bar";
import { CheckpointSelector } from "./checkpoint-selector";

export interface StepRunSidebarProps {}

export interface StepRunProps {
	stepRun: StepRunDTO;
}

interface StatusContent {
	icon: React.ReactNode;
	text: string;
}

interface StepStatusIndicatorProps {
	/** The current status of the step */
	status: StepNodeStatus;
	/** The name of the step being executed */
	stepName: string;
}

const StepStatusIndicator: React.FC<StepStatusIndicatorProps> = ({
	status,
	stepName,
}) => {
	const getStatusContent = (): StatusContent | null => {
		switch (status) {
			case "Running":
				return {
					icon: <Loader2 className="w-4 h-4 mr-2" />,
					text: "is running",
				};
			case "Queue":
				return {
					icon: <Clock className="w-4 h-4 mr-2" />,
					text: "is queueing",
				};
			case "Completed":
				return {
					icon: <Moon className="w-4 h-4 mr-2" />,
					text: "has completed",
				};
			case "Failed":
				return {
					icon: <Moon className="w-4 h-4 mr-2" />,
					text: "has completed",
				};
			case "NotReady":
				return {
					icon: <Moon className="w-4 h-4 mr-2" />,
					text: "is wait to be queued",
				};
			default:
				return null;
		}
	};

	const statusContent = getStatusContent();

	if (!statusContent) return null;

	return (
		<div className="flex items-center space-x-2 pt-1">
			<span className="text-sm text-foreground font-bold text-nowrap">
				{stepName}
			</span>
			<span className="text-sm text-muted-foreground italic text-nowrap">
				{statusContent.text}
			</span>
		</div>
	);
};

const StepRunCard: React.FC<StepRunProps> = (props) => {
	const [stepRun, setStepRun] = useState<StepRunDTO>(props.stepRun);
	const [variableIsCollapsed, setVariableIsCollapsed] =
		useState<boolean>(true);
	useEffect(() => {
		setStepRun(props.stepRun);
	}, [props.stepRun]);

	return (
		<div className="flex w-full flex-col">
			{stepRun.step?.name && (
				<StepStatusIndicator
					status={ToStepNodeStatus(stepRun.status)}
					stepName={stepRun.step.name}
				/>
			)}
			{stepRun.result && stepRun.status === "Variable" && (
				<div
					onClick={() => setVariableIsCollapsed(!variableIsCollapsed)}
				>
					<div className="flex items-center space-x-2 py-1">
						<span className="text-sm text-primary font-bold text-nowrap">
							{stepRun.result?.name}
						</span>
						<span className="text-sm text-muted-foreground italic text-nowrap">
							returns a result
						</span>
						{variableIsCollapsed ? (
							<ChevronDown className="h-5 w-5 text-gray-500" />
						) : (
							<ChevronUp className="h-5 w-5 text-gray-500" />
						)}
					</div>
				</div>
			)}

			{!variableIsCollapsed && stepRun.result && (
				<div className="flex flex-col justify-between bg-accent p-2 rounded-lg overflow-x-auto">
					<VariableCard variable={stepRun.result} />
				</div>
			)}
		</div>
	);
};

const StepRunSidebar: React.FC<StepRunSidebarProps> = () => {
	const { selectedStepRunHistory } = useStepRunHistoryStore();
	const page = useChatSideBarStore((state) => state.page);
	return (
		<div className="flex flex-col border-2 h-screen h-max-screen p-4 shadow-xl gap-2 bg-sidebar rounded-lg">
			<ChatNavigationTopBar />
			{page === "chat" && (
				<div className="flex flex-col grow overflow-y-auto">
					<div className="flex flex-col grow overflow-y-auto mb-8">
						<ChatHistory />
					</div>
					<ChatBox />
					<ChatControlBar />
				</div>
			)}
			{page === "runHistory" && <CheckpointSelector />}
			{page === "runHistory" && (
				<div className="flex flex-col  overflow-y-auto mb-8">
					{selectedStepRunHistory.map((stepRun, index) => (
						<StepRunCard key={index} stepRun={stepRun} />
					))}
				</div>
			)}
		</div>
	);
};

export default StepRunSidebar;

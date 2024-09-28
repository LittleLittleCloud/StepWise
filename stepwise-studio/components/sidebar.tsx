// sidebar component
// | StepWise Studio |
// | ---------------- |
// | [workflow-1]     |
// | [workflow-2]     |
// | [workflow-3]     |
// | ...              |
// | Theme:       [light/dark] |
// | Account:     [username]   |

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { WorkflowDTO } from "@/stepwise-client";
import Workflow, { WorkflowData } from "./workflow";
import ThemeSwitch from "./theme-switch";
import {
	FileTextIcon,
	Github,
	Icon,
	LucideGithub,
	Moon,
	Sun,
} from "lucide-react";
import { buttonVariants } from "./ui/button";
import { CircleUserRound } from "lucide-react";
import { Network } from "lucide-react";
import Divider from "./divider";
import { Badge } from "./ui/badge";
import StepWiseIcon from "@/public/stepwise-logo.svg";
import Image from "next/image";
import Link from "next/link";

interface SidebarProps {
	user: string;
	version: string;
	workflows: WorkflowData[];
	selectedWorkflow?: WorkflowData;
	onWorkflowSelect: (workflow: WorkflowData) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
	const [username, setUsername] = useState<string>(props.user);
	const [workflows, setWorkflows] = useState<WorkflowData[]>(props.workflows);
	const iconSize = 14;
	const [selectedWorkflow, setSelectedWorkflow] = useState<
		WorkflowData | undefined
	>(undefined);
	const { theme, setTheme, systemTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setUsername(props.user);
		setWorkflows(props.workflows);
		setSelectedWorkflow(
			props.selectedWorkflow ?? props.workflows[0] ?? undefined,
		);
	}, [props.user, props.workflows, props.selectedWorkflow]);

	useEffect(() => {
		if (selectedWorkflow) {
			props.onWorkflowSelect(selectedWorkflow);
		}
	}, [selectedWorkflow]);

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
		if (theme === null && systemTheme) {
			setTheme(systemTheme);
		}

		console.log("ThemeSwitch mounted");
		console.log("theme", theme);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<div className="flex flex-col h-screen p-4 shadow-xl bg-background">
			{/* top bar */}
			<div className="flex items-center gap-2 mb-2">
				<Image
					src={StepWiseIcon}
					alt="StepWise Logo"
					className="w-6 h-6"
				/>
				<span className="text-x font-bold text-nowrap">StepWise</span>
			</div>
			<div>
				<Badge variant="pink" size="sm" className="text-xs">
					{props.version}
				</Badge>
			</div>

			<Divider />
			{/* workflows */}
			<div className="flex flex-col grow mb-4 gap-2">
				{workflows.map((workflow, index) => (
					<div
						key={index}
						className={cn(
							"flex items-center py-1 pr-2 gap-2 rounded-lg",
							// hover
							"hover:bg-accent/50 cursor-pointer",
							// selected
							selectedWorkflow === workflow ? "bg-accent" : "",
						)}
						onClick={() => setSelectedWorkflow(workflow)}
					>
						<div
							className={buttonVariants({
								variant: "outline",
								size: "tinyIcon",
							})}
						>
							<Network size={iconSize} />
						</div>
						<span className={cn("text-sm text-nowrap")}>
							{workflow.name}
						</span>
					</div>
				))}
			</div>
			<Divider />
			{/* buttom bar */}
			<div className="flex flex-col gap-1">
				<Link
					href={"https://littlelittlecloud.github.io/StepWise"}
					target="_blank"
					className="flex justify-between hover:bg-accent/50 cursor-pointer rounded-lg"
				>
					<div className="flex items-center gap-2 ">
						<div
							className={buttonVariants({
								variant: "outline",
								size: "tinyIcon",
							})}
						>
							<FileTextIcon size={iconSize} />
						</div>
						<span className="text-sm">Docs</span>
					</div>
				</Link>
				<div
					className="flex justify-between hover:bg-accent/50 cursor-pointer rounded-lg"
					onClick={() =>
						theme === "dark" ? setTheme("light") : setTheme("dark")
					}
				>
					<div className="flex items-center gap-2">
						<div
							className={buttonVariants({
								variant: "outline",
								size: "tinyIcon",
							})}
						>
							{theme === "dark" ? (
								<Moon size={iconSize} />
							) : (
								<Sun size={iconSize} />
							)}
						</div>
						<span className="text-sm">Theme</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Sidebar;

function setMounted(arg0: boolean) {
	throw new Error("Function not implemented.");
}

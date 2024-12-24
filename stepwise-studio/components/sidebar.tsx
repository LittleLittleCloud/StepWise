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
import {
	ArrowLeftSquare,
	ArrowLeftToLineIcon,
	ArrowRightToLineIcon,
	Bug,
	FileTextIcon,
	Github,
	Icon,
	LucideGithub,
	Moon,
	Settings,
	Sun,
	ToggleRightIcon,
} from "lucide-react";
import { buttonVariants } from "./ui/button";
import { CircleUserRound } from "lucide-react";
import { Network } from "lucide-react";
import Divider from "./divider";
import { Badge } from "./ui/badge";
import StepWiseIcon from "@/public/stepwise-logo.svg";
import Image from "next/image";
import Link from "next/link";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useWorkflow, useWorkflowStore } from "@/hooks/useWorkflow";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	useSidebar,
} from "./ui/sidebar";
import SidebarAccountMenu from "./account";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { usePageStore } from "@/pages";

interface SidebarProps {}

const StepWiseSidebar: React.FC<SidebarProps> = (props) => {
	const iconSize = 14;
	const { theme, setTheme, systemTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const { workflows, setSelectedWorkflow, selectedWorkflow } = useWorkflow();
	const selectPage = usePageStore((state) => state.selectPage);
	const {
		setSelectedStepRunHistory,
		selectedStepRunHistory,
		stepRunHistories,
	} = useStepRunHistoryStore();
	const stepwiseConfiguration = useStepwiseServerConfiguration();
	const {
		state,
		open,
		setOpen,
		openMobile,
		setOpenMobile,
		isMobile,
		toggleSidebar,
	} = useSidebar();

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
		if (theme === null && systemTheme) {
			setTheme(systemTheme);
		}
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<Sidebar collapsible="icon">
			{/* top bar */}
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-10 items-center justify-center rounded-lg">
								<Image src={StepWiseIcon} alt="StepWise Logo" />
							</div>
							<Link
								href={
									// jump to index
									"/"
								}
								className="flex flex-col gap-1 leading-none"
							>
								<span className="text-xl font-semibold">
									StepWise
								</span>
								<span className="">
									v{stepwiseConfiguration?.version}
								</span>
							</Link>
						</SidebarMenuButton>
						{state === "expanded" && (
							<SidebarMenuAction>
								<button
									onClick={toggleSidebar}
									className={cn(
										"p-2 rounded-lg hover:bg-accent/50",
										buttonVariants,
									)}
								>
									<ArrowLeftToLineIcon size={iconSize} />
								</button>
							</SidebarMenuAction>
						)}
					</SidebarMenuItem>
					{state === "collapsed" && (
						<SidebarMenuItem>
							<SidebarMenuButton
								onClick={toggleSidebar}
								className={cn(
									"p-2 rounded-lg hover:bg-accent/50",
									buttonVariants,
								)}
							>
								<ArrowRightToLineIcon size={iconSize} />
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarHeader>
			<SidebarSeparator />
			{/* workflows */}
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Workflows</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{workflows.map((workflow, index) => (
								<SidebarMenuItem key={index}>
									<SidebarMenuButton
										className={
											selectedWorkflow?.name ===
											workflow.name
												? "bg-accent/50"
												: ""
										}
										onClick={() => {
											selectPage("workflow");
											setSelectedWorkflow(workflow);
											if (
												stepRunHistories[workflow.name]
											) {
												setSelectedStepRunHistory(
													stepRunHistories[
														workflow.name
													],
												);
											} else {
												setSelectedStepRunHistory([]);
											}
										}}
									>
										<Network size={iconSize} />
										<span className="text-sm">
											{workflow.name}
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarSeparator />
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={() => {
								selectPage("llm-configuration");
							}}
						>
							<Settings size={iconSize} />
							<span className="text-sm">Configure LLMs</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<Bug size={iconSize} />
							<Link
								href={
									"https://github.com/LittleLittleCloud/StepWise/issues/new"
								}
								target="_blank"
								className="flex justify-between hover:bg-accent/50 cursor-pointer rounded-lg"
							>
								<span className="text-sm">Create Issue</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<FileTextIcon size={iconSize} />
							<Link
								href={
									"https://littlelittlecloud.github.io/StepWise"
								}
								target="_blank"
								className="flex justify-between hover:bg-accent/50 cursor-pointer rounded-lg"
							>
								<span className="text-sm">Documents</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={() =>
								theme === "dark"
									? setTheme("light")
									: setTheme("dark")
							}
						>
							{theme === "dark" ? (
								<Moon size={iconSize} />
							) : (
								<Sun size={iconSize} />
							)}
							<span className="text-sm">Switch Theme</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				{stepwiseConfiguration?.enableAuth0Authentication && (
					<SidebarAccountMenu />
				)}
			</SidebarFooter>
		</Sidebar>
	);
};

export default StepWiseSidebar;

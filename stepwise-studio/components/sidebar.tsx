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
	Bug,
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
import { useVersion } from "@/hooks/useVersion";
import { useWorkflowStore } from "@/hooks/useWorkflow";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "./ui/sidebar";

interface SidebarProps {}

const StepWiseSidebar: React.FC<SidebarProps> = (props) => {
	const iconSize = 14;
	const { theme, setTheme, systemTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const version = useVersion();
	const { workflows, selectedWorkflow, setSelectedWorkflow } =
		useWorkflowStore();

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
									"https://github.com/LittleLittleCloud/StepWise"
								}
								target="_blank"
								className="flex flex-col gap-1 leading-none"
							>
								<span className="text-xl font-semibold">
									StepWise
								</span>
								<span className="">v{version}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
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
										onClick={() =>
											setSelectedWorkflow(workflow)
										}
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
						<SidebarMenuButton>
							<CircleUserRound size={iconSize} />
							<span className="text-sm">Account</span>
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
			</SidebarFooter>
		</Sidebar>
	);
};

export default StepWiseSidebar;

import Image from "next/image";
import localFont from "next/font/local";
import StepWiseSidebar from "@/components/sidebar";
import {
	client,
	getApiV1StepWiseControllerV1ListWorkflow,
	getApiV1StepWiseControllerV1Version,
	postApiV1StepWiseControllerV1ExecuteStep,
	StepDTO,
	StepRunDTO,
	WorkflowDTO,
} from "@/stepwise-client";
import ReactFlow, {
	Background,
	Controls,
	Edge,
	Connection,
	Node,
	useNodesState,
	useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import Workflow, { WorkflowData } from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";
import { use, useEffect, useState } from "react";
import { getLayoutedElements } from "@/lib/utils";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import { useWorkflowStore } from "@/hooks/useWorkflow";

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	weight: "100 900",
});
const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	weight: "100 900",
});

// if env is development, use the local server
if (process.env.NODE_ENV === "development") {
	const originalConfig = client.getConfig();
	client.setConfig({
		...originalConfig,
		baseUrl: "http://localhost:5123",
	});
}

export default function Home() {
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
	const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows);

	useEffect(() => {
		fetchWorkflows();
	}, []);

	return (
		<div
			className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
		>
			<Workflow
				dto={selectedWorkflow}
				onWorkflowChange={(workflowData) =>
					updateWorkflow(workflowData)
				}
			/>
			<Toaster />
		</div>
	);
}

import Image from "next/image";
import StepWiseSidebar from "@/components/sidebar";
import { client } from "@/stepwise-client";
import "reactflow/dist/style.css";
import Workflow, { WorkflowData } from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";
import { use, useEffect, useState } from "react";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/router";
import { create } from "zustand";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { LLMConfiguration } from "@/components/llm-configuration";

// if env is development, use the local server
if (process.env.NODE_ENV === "development") {
	const originalConfig = client.getConfig();
	client.setConfig({
		...originalConfig,
		baseUrl: "http://localhost:5123",
	});
}

export type Page = "workflow" | "llm-configuration";

export interface PageState {
	currentPage: Page;
	selectPage: (page: Page) => void;
}

export const usePageStore = create<PageState>((set) => ({
	currentPage: "workflow",
	selectPage: (page) => set({ currentPage: page }),
}));

export default function Home() {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
	const router = useRouter();
	const configuration = useStepwiseServerConfiguration();
	const currentPage = usePageStore((state) => state.currentPage);

	useEffect(() => {
		// Check authentication after loading completes
		if (
			!isLoading &&
			!isAuthenticated &&
			configuration?.enableAuth0Authentication
		) {
			loginWithRedirect({
				appState: { returnTo: router.asPath },
			});
		}
	}, [
		isLoading,
		isAuthenticated,
		configuration,
		loginWithRedirect,
		router.asPath,
	]);

	return isAuthenticated || !configuration?.enableAuth0Authentication ? (
		<ResizablePanelGroup
			direction="horizontal"
			className="w-full h-screen flex"
		>
			<ResizablePanel className="overflow-y-auto">
				{currentPage === "workflow" && <Workflow />}
				{currentPage === "llm-configuration" && <LLMConfiguration />}
			</ResizablePanel>
			<ResizableHandle withHandle={true} />
			<ResizablePanel defaultSize={30} minSize={30}>
				<StepRunSidebar />
			</ResizablePanel>
		</ResizablePanelGroup>
	) : null;
}

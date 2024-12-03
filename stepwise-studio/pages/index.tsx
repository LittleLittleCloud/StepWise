import Image from "next/image";
import localFont from "next/font/local";
import StepWiseSidebar from "@/components/sidebar";
import { client } from "@/stepwise-client";
import "reactflow/dist/style.css";
import Workflow, { WorkflowData } from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";
import { use, useEffect, useState } from "react";
import { getLayoutedElements } from "@/lib/utils";

import { withAuthenticationRequired } from "@auth0/auth0-react";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/router";

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
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
	const router = useRouter();
	const configuration = useStepwiseServerConfiguration();

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
		<div
			className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
		>
			<Workflow />
		</div>
	) : null;
}

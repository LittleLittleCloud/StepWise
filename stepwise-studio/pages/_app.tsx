import StepWiseSidebar from "@/components/sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Auth0Provider } from "@auth0/auth0-react";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import type { AppProps } from "next/app";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import Router from "next/router";
import { useStepwiseServerConfiguration } from "@/hooks/useVersion";
import { useOpenAIConfiguration } from "@/components/openai-configure-card";
import { useClaudeConfiguration } from "@/components/claude-configure-card";

export default function App({ Component, pageProps }: AppProps) {
	const [redirect_uri, setRedirectUri] = useState<string | null>(null);
	const stepwiseConfiguration = useStepwiseServerConfiguration();
	const { readApiKeyFromStorage } = useOpenAIConfiguration();
	const { readApiKeyFromStorage: readClaudeApiKeyFromStorage } =
		useClaudeConfiguration();

	useEffect(() => {
		setRedirectUri(window.location.origin);
		readApiKeyFromStorage();
	}, []);

	return stepwiseConfiguration?.enableAuth0Authentication &&
		stepwiseConfiguration.auth0ClientId &&
		stepwiseConfiguration.auth0Domain ? (
		<Auth0Provider
			domain={stepwiseConfiguration!.auth0Domain}
			clientId={stepwiseConfiguration.auth0ClientId}
			onRedirectCallback={(appState, user) => {
				Router.replace(appState?.returnTo || "/");
			}}
			authorizationParams={{
				redirect_uri: redirect_uri ?? "http://localhost:3000",
				audience:
					stepwiseConfiguration.auth0Audience ??
					"https://localhost:5123",
			}}
		>
			<SidebarProvider>
				<ThemeProvider defaultTheme="dark" attribute="class">
					<StepWiseSidebar />
					<Component {...pageProps} />
					<Toaster position="top-right" />
				</ThemeProvider>
			</SidebarProvider>
		</Auth0Provider>
	) : (
		<SidebarProvider>
			<ThemeProvider defaultTheme="dark" attribute="class">
				<StepWiseSidebar />
				<Component {...pageProps} />
				<Toaster position="top-right" />
			</ThemeProvider>
		</SidebarProvider>
	);
}

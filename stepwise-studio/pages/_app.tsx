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

export default function App({ Component, pageProps }: AppProps) {
	const [redirect_uri, setRedirectUri] = useState<string | null>(null);
	const stepwiseConfiguration = useStepwiseServerConfiguration();

	useEffect(() => {
		setRedirectUri(window.location.origin);
		console.log("Redirect URI: ", window.location.origin);
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
				audience: "http://localhost:5123",
			}}
		>
			<SidebarProvider>
				<ThemeProvider defaultTheme="dark" attribute="class">
					<StepWiseSidebar />
					<Component {...pageProps} />
					<Toaster />
				</ThemeProvider>
			</SidebarProvider>
		</Auth0Provider>
	) : (
		<SidebarProvider>
			<ThemeProvider defaultTheme="dark" attribute="class">
				<StepWiseSidebar />
				<Component {...pageProps} />
				<Toaster />
			</ThemeProvider>
		</SidebarProvider>
	);
}

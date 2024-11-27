import StepWiseSidebar from "@/components/sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
	return (
		<SidebarProvider>
			<ThemeProvider defaultTheme="dark" attribute="class">
				<StepWiseSidebar />
				<Component {...pageProps} />
			</ThemeProvider>
		</SidebarProvider>
	);
}

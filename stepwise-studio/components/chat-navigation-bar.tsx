import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Smartphone,
	MessageSquare,
	Plus,
	Clock,
	MoreHorizontal,
	X,
	History,
	Loader2,
	RotateCcw,
} from "lucide-react";
import { create } from "zustand";
import { useChatHistoryStore } from "./chat-history";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { stat } from "fs";

export type ChatSideBarPage = "chat" | "runHistory";
export interface ChatSideBarStatus {
	page: ChatSideBarPage;
	setPage: (page: ChatSideBarPage) => void;
}

export const useChatSideBarStore = create<ChatSideBarStatus>((set) => ({
	page: "chat",
	setPage: (page) => set({ page }),
}));

export const ChatNavigationTopBar: React.FC = () => {
	const page = useChatSideBarStore((state) => state.page);
	const setPage = useChatSideBarStore((state) => state.setPage);
	const deleteMessageAfter = useChatHistoryStore(
		(state) => state.deleteMessageAfter,
	);
	const setSelectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.setSelectedStepRunHistory,
	);
	return (
		<div className="w-full flex items-center justify-between ">
			<div className="flex items-center">
				<Button
					variant="ghost"
					size="smallIcon"
					tooltip="Chat"
					onClick={() => setPage("chat")}
					className={
						page === "chat"
							? "border-b-2 border-blue-500 rounded-none"
							: ""
					}
				>
					<MessageSquare className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="smallIcon"
					tooltip="Run History"
					onClick={() => setPage("runHistory")}
					className={
						page === "runHistory"
							? "border-b-2 border-blue-500 rounded-none"
							: ""
					}
				>
					<History className="h-4 w-4" />
				</Button>
				<Separator orientation="vertical" className="h-6" />
			</div>

			<div className="flex items-center space-x-2">
				<Button
					variant="ghost"
					size="smallIcon"
					tooltip={
						page === "chat" ? "Clear Chat" : "Clear Run History"
					}
					onClick={() => {
						if (page === "chat") {
							deleteMessageAfter(0);
						}

						if (page === "runHistory") {
							setSelectedStepRunHistory([]);
						}
					}}
				>
					<RotateCcw className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
};

import useAccount from "@/hooks/useAccount";
import React, { use } from "react";
import {
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "./ui/sidebar";
import { CircleUserRound, LogOut, Plus } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import Image from "next/image";

const SidebarAccountMenu: React.FC = () => {
	const {
		isLoading,
		isAuthenticated,
		error,
		user,
		loginWithRedirect,
		logout,
	} = useAuth0();
	return (
		<SidebarMenu>
			{!isAuthenticated && (
				<SidebarMenuItem>
					{/* if isLoggedIn is false, login */}
					<SidebarMenuButton
						size={"lg"}
						onClick={() => loginWithRedirect()}
					>
						<CircleUserRound size={36} />
						<span>Login</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			)}
			{/* if isLoggedIn is true, show username/user image/logout button */}
			{isAuthenticated && (
				<SidebarMenuItem>
					<SidebarMenuButton size={"lg"} onClick={() => logout()}>
						{user?.picture && (
							<Image
								src={user?.picture}
								alt="Profile picture"
								width={36}
								height={36}
								className="rounded-full"
							/>
						)}
						<span>{user?.name}</span>
					</SidebarMenuButton>
					<SidebarMenuAction onClick={() => logout()}>
						<LogOut /> <span className="sr-only">Add Project</span>
					</SidebarMenuAction>
				</SidebarMenuItem>
			)}
		</SidebarMenu>
	);
};

export default SidebarAccountMenu;

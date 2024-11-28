import useAccount from '@/hooks/useAccount';
import React from 'react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import { CircleUserRound } from 'lucide-react';

const SidebarAccountMenu: React.FC = () => {
  const { username, email, isLoggedIn, login, logout } = useAccount();

  return (
    <SidebarMenu>
        <SidebarMenuItem>
            <SidebarMenuButton size={"lg"}>
                <CircleUserRound size={36} />
                <span>{username}</span>
            </SidebarMenuButton>
          
        </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default SidebarAccountMenu;
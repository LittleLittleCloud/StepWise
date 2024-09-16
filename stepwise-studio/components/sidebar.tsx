// sidebar component
// | StepWise Studio |
// | ---------------- |
// | [workflow-1]     |
// | [workflow-2]     |
// | [workflow-3]     |
// | ...              |
// | Theme:       [light/dark] |
// | Account:     [username]   |

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes'
import { WorkflowDTO } from '@/stepwise-client';
import Workflow from './workflow';
import ThemeSwitch from './theme-switch';
import { Github, Icon, LucideGithub, Moon } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { CircleUserRound } from 'lucide-react';
import { Network } from 'lucide-react';
import Divider from './divider';
import { Badge } from './ui/badge';
import StepWiseIcon from '@/public/stepwise-logo.svg';
import Image from 'next/image';

interface SidebarProps {
    user: string;
    version: string;
    workflows: WorkflowDTO[];
    onWorkflowSelect: (workflow: WorkflowDTO) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const [username, setUsername] = useState<string>(props.user);
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>(props.workflows);
    const iconSize = 14;
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDTO | null>(null);

    useEffect(() => {
        setUsername(props.user);
        setWorkflows(props.workflows);
        setSelectedWorkflow(props.workflows[0]);
    }, [props.user, props.workflows]);

    const selectWorkflowHander = (workflow: WorkflowDTO) => {
        setSelectedWorkflow(workflow);
        props.onWorkflowSelect(workflow);
    }

    return (
        <div className="flex flex-col h-screen p-4 shadow-xl bg-background">
            {/* top bar */}
            <div className="flex items-center gap-2 mb-2">
                <Image
                    src={StepWiseIcon}
                    alt="StepWise Logo"
                 className="w-6 h-6" />
                <span className="text-x font-bold text-nowrap">StepWise</span>
            </div>
            <div>
                <Badge
                    variant="pink"
                    size="sm"
                    className="text-xs">{props.version}</Badge>
            </div>

            <Divider />
            {/* workflows */}
            <div className="flex flex-col grow mb-4 gap-2">
                {workflows.map((workflow, index) => (
                    <div
                        key={index}
                        className={cn('flex items-center py-1 pr-2 gap-2 rounded-lg',
                            // hover
                            'hover:bg-accent/50 cursor-pointer',
                            // selected
                            selectedWorkflow === workflow ? 'bg-accent' : ''
                        )}
                        onClick={() => selectWorkflowHander(workflow)}
                    >
                        <div className={buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }
                        )}>
                            <Network size={iconSize} />
                        </div>
                        <span className={cn('text-sm text-nowrap')}>{workflow.name}</span>
                    </div>
                ))}
            </div>
            <Divider />
            {/* buttom bar */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className={buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }
                        )}>
                            <Moon size={iconSize} />
                        </div>
                        <span className="text-sm">Theme</span>
                    </div>
                    <ThemeSwitch />
                </div>
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className={buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }
                        )}>
                            <CircleUserRound size={iconSize} />
                        </div>
                        <span className="text-sm">Account</span>
                    </div>
                    <span className="text-sm">{username}</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
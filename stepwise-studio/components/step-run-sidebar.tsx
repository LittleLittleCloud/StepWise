import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes'
import { StepRunAndResultDTO, StepRunDTO, WorkflowDTO } from '@/stepwise-client';
import Workflow from './workflow';
import ThemeSwitch from './theme-switch';
import { Icon, Moon, SquareFunction } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { CircleUserRound } from 'lucide-react';
import { Network } from 'lucide-react';
import Divider from './divider';
import { Badge } from './ui/badge';
import { Markdown } from './markdown';

interface StepRunSidebarProps {
    stepRuns: StepRunAndResultDTO[];
}

interface StepRunProps {
    stepRun: StepRunAndResultDTO;
}

const StepRunCard: React.FC<StepRunProps> = (props) => {
    const [stepRun, setStepRun] = useState<StepRunAndResultDTO>(props.stepRun);

    useEffect(() => {
        setStepRun(props.stepRun);
    }, [props.stepRun]);

    return (
        <div className="flex flex-col gap-2 p-2 bg-accent rounded-lg">
            <div className="flex justify-between items-center">
            <div className="flex items-center">
                <div
                    className={cn(buttonVariants(
                        {
                            variant: "outline",
                            size: "tinyIcon",
                        }),
                    )}
                >
                    <SquareFunction size={16} />
                </div>
                <span className="text-sm font-semibold">{props.stepRun.stepRun?.step?.name}</span>
            </div>
                <Badge
                    variant="pink"
                    size={"sm"}
                    className='p-1 text-xs'
                    >{props.stepRun.result?.type}
                </Badge>
            </div>
            
            {/* display text value if exist */}
            {props.stepRun.result?.displayValue && (
                <div className="flex flex-col justify-between bg-background rounded-lg px-2">
                    <Markdown>{props.stepRun.result?.displayValue}</Markdown>
                </div>
            )}
        </div>
    );
}

const StepRunSidebar: React.FC<StepRunSidebarProps> = (props) => {
    const [stepRuns, setStepRuns] = useState<StepRunAndResultDTO[]>(props.stepRuns);

    useEffect(() => {
        setStepRuns(props.stepRuns);
    }, [props.stepRuns]);

    return (
        <div className="flex flex-col w-80 h-screen p-4 shadow-xl bg-background rounded-lg">
            {/* top bar */}
            <span className="text-x font-bold text-nowrap">Completed StepRun</span>
            {/* stepRuns */}
            <div className="flex flex-col grow mb-4 gap-2">
                <Divider />

                {stepRuns.map((stepRun, index) => (
                    <StepRunCard key={index} stepRun={stepRun} />
                ))}
            </div>
        </div>
    );
}

export default StepRunSidebar;
// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

import { ChangeEvent, FC, useState } from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { icons, Layout, LayoutGrid, Play, RotateCcw } from 'lucide-react';

interface ControlBarProps {
    onRunClick: () => void;
    onResetStepRunResultClick: () => void;
    onMaxParallelChange: (value: number) => void;
    maxParallel: number;
    maxSteps: number;
    onAutoLayoutClick: () => void;
    onMaxStepsChange: (value: number) => void;
}

export const ControlBar: FC<ControlBarProps> = (props) => {
    const [maxSteps, setMaxSteps] = useState<number>(props.maxSteps);

    const iconSize = 14;

    const onMaxStepsChange = (e: ChangeEvent<HTMLInputElement>) => {
        setMaxSteps(parseInt(e.target.value));
        props.onMaxStepsChange(parseInt(e.target.value));
    };

    return (
        <div className="flex flex-wrap justify-between items-center m-4 px-2 p-1 bg-background shadow-xl rounded-md">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <button
                        className={cn(buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }),
                            "hover:bg-accent/50",
                        )}
                        onClick={props.onRunClick}
                    >
                        <Play size={iconSize} />
                    </button>
                    <button
                        className={cn(buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }),
                        )}
                        onClick={props.onResetStepRunResultClick}
                    >
                        <RotateCcw size={iconSize} />
                    </button>
                </div>
                {/* vertical divider */}
                <div className="h-6 w-0.5 bg-accent/50" />
                <div className="flex items-center gap-4">

                    <div className="flex items-center gap-2">
                        <span>Max Parallel Run:</span>
                        <input
                            type="number"
                            value={props.maxParallel}
                            onChange={(e) => props.onMaxParallelChange(parseInt(e.target.value))}
                            className="w-12 p-1 text-xxs bg-accent/50 rounded-lg border border-accent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span>Max Steps:</span>
                        <input
                            type="number"
                            value={maxSteps}
                            onChange={onMaxStepsChange}
                            className="w-12 p-1 text-xs bg-background rounded-lg border border-accent"
                        />
                    </div>
                </div>
                <div className="h-6 w-0.5 bg-accent/50" />
                <button
                    className={cn(buttonVariants(
                        {
                            variant: "outline",
                            size: "tinyIcon",
                        }),
                    )}
                    onClick={props.onAutoLayoutClick}
                >
                    <LayoutGrid size={iconSize} />
                </button>
            </div>
        </div>
    );
};
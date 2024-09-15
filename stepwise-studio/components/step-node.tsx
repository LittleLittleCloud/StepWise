import { StepDTO } from '@/stepwise-client';
import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Button, buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { CircleUserRound, Play, RotateCcw, SquareFunction } from 'lucide-react';
import Divider from './divider';

export interface StepNodeProps {
    data: StepDTO;
    onRunClick: (step: StepDTO) => void;
}
const StepNode: React.FC<NodeProps<StepNodeProps>> = (prop) => {
    const [data, setData] = useState<StepDTO>(prop.data.data);

    useEffect(() => {
        setData(prop.data.data);
    }, []);

    return (
        <div className="rounded-md shadow-md p-2 bg-background/50 group ">
            {/* settings bar */}
            {/* appear when hover */}
            <div
                className="invisible flex group-hover:visible absolute -top-5 right-0 bg-background/50 rounded gap-1 m-0 p-1"
            >
                <Button
                    variant={"outline"}
                    size={"xxsIcon"}
                    className='m-0 p-0'
                    onClick={() => prop.data.onRunClick(data)}
                >
                    <Play/>
                </Button>
                <Button
                    variant={"outline"}
                    size={"xxsIcon"}
                    className='m-0 p-0'
                >
                    <RotateCcw/>
                </Button>
            </div>

            {/* set up source handles */}
            {/* the source handles will be put to the left */}
            {/* and the y will start from 50, and incremented by 20 */}
            {
                data.dependencies && data.dependencies.map((dep, index) => (
                    <Handle
                        key={index}
                        type="target"
                        position={Position.Left}
                        // id = name-dep
                        id={`${data.name}-${dep}`}
                        className="w-2 h-2 border-none bg-blue-500"
                        style={{ top: 48 + index * 20 }}
                    />
                ))
            }
            {/* set up target handles */}
            {/* the target handles will be put to the right */}
            {/* and the y will start from 30 */}
            {
                <Handle
                    type="source"
                    position={Position.Right}
                    // id = name-variable
                    id={`${data.name}`}
                    className="w-2 h-2 border-none bg-green-500"
                    style={{ top: 17 }}
                />
            }
            {data.name && (
                <div
                    className='flex gap-1 items-center'
                >
                    <div
                        className={cn(buttonVariants(
                            {
                                variant: "outline",
                                size: "tinyIcon",
                            }),
                            "w-4 h-4"
                        )}
                    >
                        <SquareFunction size={10} />
                    </div>
                    <h2 className="text-xs font-semibold text-nowrap">{data.name}</h2>
                </div>
            )}


            {data.dependencies && data.dependencies.length > 0 && (
                <div>
                    <div className="border border-primary/40 my-2" />
                    {
                        data.dependencies.map((dep, index) => (
                            <div key={index} className="flex gap-1 items-center text-xs pb-1">
                                <div className={cn(buttonVariants(
                                    {
                                        variant: "outline",
                                        size: "tinyIcon",
                                    }),
                                    "w-4 h-4"
                                )}>
                                    <SquareFunction size={10} />
                                </div>
                                <span>{dep}</span>
                            </div>
                        ))
                    }
                </div>
            )}

        </div>
    );
};

export default StepNode;
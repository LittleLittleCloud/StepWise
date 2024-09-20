import { StepDTO } from '@/stepwise-client';
import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
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
    const titleRef = React.useRef<HTMLDivElement>(null);
    const updateNodeInternals = useUpdateNodeInternals();
    const [sourceHandleTopOffset, setSourceHandleTopOffset] = useState<number>(0);
    const [targetHandleTopOffsets, setTargetHandleTopOffsets] = useState<number[]>([]);

    useEffect(() => {
        setData(prop.data.data);
        setTargetHandleTopOffsets(Array(data.dependencies?.length ?? 0).fill(0));
    }, []);
    const dividerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (titleRef.current) {
            setSourceHandleTopOffset(titleRef.current.offsetTop + titleRef.current.offsetHeight / 2);

            updateNodeInternals(prop.id);
        }
    }, [titleRef.current]);

    useEffect(() => {
        if (dividerRef.current && data.dependencies && data.dependencies.length > 0) {
            const offsets = data.dependencies?.map((_, index) => {
                const height = dividerRef.current!.offsetHeight / data.dependencies!.length;
                const offset = dividerRef.current!.offsetTop + index * height + height / 2 - 2; // 2 is the padding top.
                return offset;
            }) ?? [];
            setTargetHandleTopOffsets(offsets);
        }
    }, [dividerRef.current, data.dependencies]);

    return (
        <div className="rounded-md shadow-md p-1 bg-background/50 group min-w-32">
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
                    <Play />
                </Button>
                <Button
                    variant={"outline"}
                    size={"xxsIcon"}
                    className='m-0 p-0'
                >
                    <RotateCcw />
                </Button>
            </div>

            {data.name && (
                <div
                    className='flex gap-1 items-center'
                >
                    <div
                        ref={titleRef}
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
                    <h2 className="text-xs font-semibold text-nowrap pr-5">{data.name}</h2>
                    <Handle
                        type="source"
                        position={Position.Right}
                        // id = name-variable
                        id={`${data.name}`}
                        className="w-2 h-2 border-none bg-green-500"
                        style={{ top: sourceHandleTopOffset, right: 5 }}
                    />
                </div>
            )}


            {data.dependencies && data.dependencies.length > 0 && (
                <div>
                    <div className="border border-primary/40 my-2" />
                    <div ref={dividerRef}>
                    {
                        data.dependencies.map((dep, index) => (
                            <div key={index} className="flex gap-1 pl-5 pr-5 items-center text-xs pb-1">
                                <span>{dep}</span>
                                <Handle
                                    key={index}
                                    type="target"
                                    position={Position.Left}
                                    // id = name-dep
                                    id={`${data.name}-${dep}`}
                                    className="w-2 h-2 border-none bg-blue-500"
                                    style={{ top: targetHandleTopOffsets[index], left: 8 }}
                                />
                            </div>
                        ))
                    }
                    </div>
                </div>
            )}

        </div>
    );
};

export default StepNode;
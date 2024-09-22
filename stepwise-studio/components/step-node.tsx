import { StepDTO } from '@/stepwise-client';
import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
import { Button, buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertOctagon, CheckCircle, CheckCircle2, CircleUserRound, Clock, Loader2, Play, RotateCcw, SquareFunction } from 'lucide-react';
import Divider from './divider';

export type StepNodeStatus = 'Running' | 'Failed' | 'Queue' | 'Completed' | 'NotReady';

export interface StepNodeProps {
    data: StepDTO;
    status?: StepNodeStatus;
    // isSelected?: boolean;
    onRunClick: (step: StepDTO) => void;
}

const StepNodeStatusIndicator: React.FC<{ status: StepNodeStatus }> = ({ status }) => {
    const [stepNodeStatus, setStatus] = useState<StepNodeStatus>(status ?? 'NotReady');
    useEffect(() => {
        setStatus(status);
    }
    , [status]);

    const size = 12;

    const getStatusInfo = (status: StepNodeStatus) => {
        switch (status) {
          case 'NotReady':
            return { 
              icon: SquareFunction, 
              label: status,
            };
          case 'Queue':
            return { 
              icon: Clock, 
              label: status,
              animation: 'animate-[spin_3s_linear_infinite]'
            };
          case 'Running':
            return { 
              icon: Loader2, 
              color: 'text-yellow-500',
              label: status,
              animation: 'animate-spin'
            };
          case 'Completed':
            return { 
              icon: CheckCircle2, 
              color: 'text-green-500', 
              label: status,
            };
          case 'Failed':
            return { 
              icon: AlertCircle, 
              color: 'text-destructive', 
              label: status,
            };
          default:
            return { 
              icon: SquareFunction, 
              label: status,
            };
        }
      };

    const { icon: Icon, color, label, animation } = getStatusInfo(stepNodeStatus);

    return (
        <div
            className={cn(buttonVariants(
                {
                    variant: "outline",
                    size: "tinyIcon",
                }),
                "w-4 h-4"
            )}
        >
            <Icon size={size} className={cn(color, animation)} aria-label={label} />
        </div>
    );
}

const StepNode: React.FC<NodeProps<StepNodeProps>> = (prop) => {
    const [data, setData] = useState<StepDTO>(prop.data.data);
    const titleRef = React.useRef<HTMLDivElement>(null);
    const updateNodeInternals = useUpdateNodeInternals();
    const [sourceHandleTopOffset, setSourceHandleTopOffset] = useState<number>(0);
    const [targetHandleTopOffsets, setTargetHandleTopOffsets] = useState<number[]>([]);
    const [status, setStatus] = useState<StepNodeStatus>(prop.data.status ?? 'NotReady');
    const [isSelected, setIsSelected] = useState<boolean>(prop.selected ?? false);

    const statustransition : StepNodeStatus[] = ['NotReady', 'Queue', 'Running', 'Completed', 'Failed'];

    useEffect(() => {
        setData(prop.data.data);
        setTargetHandleTopOffsets(Array(data.dependencies?.length ?? 0).fill(0));
        setStatus(prop.data.status ?? 'NotReady');
        setIsSelected(prop.selected ?? false);
    }, []);

    useEffect(() => {
        setIsSelected(prop.selected ?? false);
    }
    , [prop.selected]);

    useEffect(() => {
        setStatus(prop.data.status ?? 'NotReady');
    }
    , [prop.data.status]);

    const dividerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        updateNodeInternals(prop.id);
    }
    , [data, sourceHandleTopOffset, targetHandleTopOffsets, status]);

    useEffect(() => {
        if (titleRef.current) {
            setSourceHandleTopOffset(titleRef.current.offsetTop + titleRef.current.offsetHeight / 2);
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
        <div className={cn("border-2 rounded-md shadow-md p-1 bg-background/50 group min-w-32",
            isSelected ? "border-primary/40" : "border-transparent")}
            // onClick={() => setIsSelected(!isSelected)}
        >
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
                    >
                        <StepNodeStatusIndicator status={status} />
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
import { ParameterDTO, StepDTO, VariableDTO } from '@/stepwise-client';
import React, { use, useCallback, useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
import { Button, buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertOctagon, CheckCircle, CheckCircle2, CircleUserRound, Clock, Loader2, Play, RotateCcw, SquareFunction, VariableIcon } from 'lucide-react';
import Divider from './divider';
import { badgeVariants } from './ui/badge';
import { Markdown } from './markdown';

export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'image' | 'file';

export interface ParameterCardProps extends ParameterDTO {
    variable?: VariableDTO;
}

export const ParameterCard: React.FC<ParameterCardProps> = (props) => {
    const [name, setName] = useState<string>(props.name ?? '');
    const [variable, setVariable] = useState<VariableDTO | undefined>(props.variable ?? undefined);
    const [parameterType, setParameterType] = useState<string>(props.parameter_type ?? '');
    const [collapsed, setCollapsed] = useState<boolean>(true);

    useEffect(() => {
        setName(props.name ?? '');
        setVariable(props.variable ?? undefined);
        setParameterType(props.parameter_type ?? '');
    }, []);

    useEffect(() => {
        setVariable(props.variable ?? undefined);
    }, [props.variable]);

    const getDisplayType = (type: string) => {
        console.log(type);
        switch (type) {
            case 'String':
                return 'str';
            case 'Int32' || 'Float32':
                return 'number';
            case 'Boolean':
                return 'bool';
            default:
                return 'object';
        }
    };

    const showAsMarkdown = (type: 'str' | 'number' | 'bool' | 'object') => {
        return ['str', 'number'].indexOf(type) > -1;
    }

    return (
        <div
            className={cn("flex flex-col gap-1 items-center bg-accent rounded px-1 py-0.5 ",
                "hover:bg-accent/80 hover:cursor-pointer")}
            onClick={() => setCollapsed(!collapsed)}
        >
            <div
                className='flex w-full gap-5 items-center justify-between'
            >
                <div
                    className='flex gap-2 px-4 items-center'
                >
                    <div className="text-xs">{name}</div>
                    <div
                        className={cn(badgeVariants({
                            variant: 'green',
                            size: 'tiny',
                        }),
                            'text-xs px-1 border-none')}
                    >{getDisplayType(parameterType)}</div>
                </div>

                {/* the brief display of variable if available */}
                {collapsed && variable && showAsMarkdown(getDisplayType(parameterType)) && (

                    <span
                        className='text-xs truncate bg-background/50 rounded px-1 max-w-[10rem]'
                    >{variable.displayValue}</span>
                )}
            </div>
            {!collapsed && variable && showAsMarkdown(getDisplayType(parameterType)) && (
                <div
                    className='flex flex-col gap-1 w-full bg-background/50 rounded px-1 overflow-x-auto'
                >
                    <Markdown
                        className='text-xs'
                    >{variable.displayValue!}</Markdown>
                </div>
            )}
        </div>
    );
}

export type StepNodeStatus = 'Running' | 'Failed' | 'Queue' | 'Completed' | 'NotReady';

export interface StepNodeProps {
    data: StepDTO;
    variables?: VariableDTO[];
    status?: StepNodeStatus;
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
    const stepNodeRef = React.useRef<HTMLDivElement>(null);
    const titleRef = React.useRef<HTMLDivElement>(null);
    const updateNodeInternals = useUpdateNodeInternals();
    const [sourceHandleTopOffset, setSourceHandleTopOffset] = useState<number>(0);
    const [status, setStatus] = useState<StepNodeStatus>(prop.data.status ?? 'NotReady');
    const [isSelected, setIsSelected] = useState<boolean>(prop.selected ?? false);
    const [parameters, setParameters] = useState<ParameterDTO[]>(prop.data.data.parameters ?? []);
    const [variables, setVariables] = useState<VariableDTO[]>([]);
    const dividerRef = React.useRef<HTMLDivElement>(null);
    const parameterRefMap = React.useRef<Map<string, HTMLDivElement>>(new Map());
    const [targetHandleTopOffsets, setTargetHandleTopOffsets] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        if (!stepNodeRef.current) return;

        setData(prop.data.data);
        setStatus(prop.data.status ?? 'NotReady');
        setIsSelected(prop.selected ?? false);
        setParameters(prop.data.data.parameters ?? []);
        setTargetHandleTopOffsets(prop.data.data.parameters?.reduce((acc, param) => {
            acc.set(param.variable_name!, 0);
            return acc;
        }, new Map<string, number>()) ?? new Map<string, number>());

        // set resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            console.log(entries);
            resizeCallback();
        });

        resizeObserver.observe(stepNodeRef.current);

        return () => {
            resizeObserver.disconnect();
        }
    }, []);

    useEffect(() => {
        setVariables(prop.data.variables ?? []);
    }, [prop.data.variables]);

    useEffect(() => {
        setIsSelected(prop.selected ?? false);
    }
        , [prop.selected]);

    useEffect(() => {
        setStatus(prop.data.status ?? 'NotReady');
    }
        , [prop.data.status]);


    useEffect(() => {
        updateNodeInternals(prop.id);
    }
    , [data, sourceHandleTopOffset, targetHandleTopOffsets, status]);

    useEffect(() => {
        if (titleRef.current) {
            setSourceHandleTopOffset(titleRef.current.offsetTop + titleRef.current.offsetHeight / 2);
        }
    }, [titleRef.current]);

    var resizeCallback = useCallback(() => {
        const offsets = Array.from(parameterRefMap.current.values()).map(el => el.offsetTop + 11);
        var newOffsetMap = new Map<string, number>();
        offsets.forEach((offset, index) => {
            newOffsetMap.set(Array.from(parameterRefMap.current.keys())[index], offset);
        });

        console.log(newOffsetMap);
        setTargetHandleTopOffsets(newOffsetMap);
    }, [parameterRefMap]);

    useEffect(() => {
        if(parameterRefMap.current && parameterRefMap.current.size > 0) {
            resizeCallback();
        }
    }, [parameterRefMap.current]);

    return (
        <div className={cn("border-2 rounded-md shadow-md p-1 bg-background/50 group min-w-32",
            isSelected ? "border-primary/40" : "border-transparent")}
            ref={stepNodeRef}
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

            
            {/* parameters */}
            {parameters && parameters.length > 0 && (
                <div>
                    <div
                        className='flex gap-1 items-center'>
                        <Button
                            variant={"outline"}
                            size={"xxsIcon"}
                            className='w-4 h-4 m-0 p-0'
                        >
                            <VariableIcon size={12} />
                        </Button>
                        <h3 className="text-xs font-semibold">Parameter</h3>
                    </div>
                    <div
                        className='flex flex-col gap-1'
                    >
                        {
                            parameters.map((param, index) => (
                                <div
                                    key={index}
                                    ref={(el) => el && parameterRefMap.current.set(param.variable_name!, el)}
                                    >
                                <ParameterCard {...param} variable={variables.find(v => v.name === param.variable_name)} />
                                <Handle
                                        key={index}
                                        type="target"
                                        position={Position.Left}
                                        // id = name-dep
                                        id={`${data.name}-${param.variable_name}`}
                                        className="w-2 h-2 border-none bg-blue-500"
                                        style={{ top: targetHandleTopOffsets.get(param.variable_name!), left: 10 }}
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
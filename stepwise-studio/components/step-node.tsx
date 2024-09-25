import { ParameterDTO, StepDTO, VariableDTO } from '@/stepwise-client';
import React, { use, useCallback, useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals, NodeResizer } from 'reactflow';
import { Button, buttonVariants } from './ui/button';
import { cn, getDisplayType, showAsMarkdown, StepType } from '@/lib/utils';
import { AlertCircle, AlertOctagon, Badge, CheckCircle, CheckCircle2, CircleUserRound, Clock, FormInputIcon, Loader2, Play, RotateCcw, SquareFunction, StickyNote, VariableIcon } from 'lucide-react';
import Divider from './divider';
import { badgeVariants } from './ui/badge';
import { Markdown } from './markdown';
import { ParameterCard } from './parameter-card';
import { VariableCard } from './variable-card';

export type StepNodeStatus = 'Running' | 'Failed' | 'Queue' | 'Completed' | 'NotReady';

export interface StepNodeProps {
    data: StepDTO;
    variables?: VariableDTO[];
    output?: VariableDTO;
    status?: StepNodeStatus;
    onRunClick: (step: StepDTO) => void;
    onSubmitOutput: (output: VariableDTO) => void;
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

const ConvertStringToStepType = (type: string): StepType => {
    switch (type) {
        case 'Ordinary':
            return 'Ordinary';
        case 'StepWiseUITextInput':
            return 'StepWiseUITextInput';
        default:
            return 'Ordinary';
    }
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
    const parameterRefMap = React.useRef<Map<string, HTMLDivElement>>(new Map());
    const [targetHandleTopOffsets, setTargetHandleTopOffsets] = useState<Map<string, number>>(new Map());
    const [output, setOutput] = useState<VariableDTO | undefined>(undefined);
    const [stepType, setStepType] = useState<StepType>(ConvertStringToStepType(prop.data.data.step_type));
    const [inputText, setInputText] = useState<string>('');

    useEffect(() => {
        if (!stepNodeRef.current) return;
        setData(prop.data.data);
        setStatus(prop.data.status ?? 'NotReady');
        setIsSelected(prop.selected ?? false);
        setParameters(prop.data.data.parameters ?? []);
        setOutput(prop.data.output ?? undefined);
        setTargetHandleTopOffsets(prop.data.data.parameters?.reduce((acc, param) => {
            acc.set(param.variable_name!, 0);
            return acc;
        }, new Map<string, number>()) ?? new Map<string, number>());

        // set resize observer
        const resizeObserver = new ResizeObserver((entries) => {
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
        setOutput(prop.data.output ?? undefined);
    }, [prop.data.output]);

    useEffect(() => {
        setIsSelected(prop.selected ?? false);
    }, [prop.selected]);

    useEffect(() => {
        setStatus(prop.data.status ?? 'NotReady');
    }, [prop.data.status]);

    useEffect(() => {
        if (prop.data.data.step_type === 'StepWiseUITextInput') {
            setStepType('StepWiseUITextInput');
        }
    }, [prop.data.data.step_type]);


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

        setTargetHandleTopOffsets(newOffsetMap);
    }, [parameterRefMap]);

    useEffect(() => {
        if (parameterRefMap.current && parameterRefMap.current.size > 0) {
            resizeCallback();
        }
    }, [parameterRefMap.current]);

    return (
        <div className={cn("border-2 max-w-96 rounded-md shadow-md p-1 bg-background/50 group min-w-32",
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
                    className='flex flex-col'
                >
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
                {data.description && (
                    
                    <h6
                        className="text-xs text-primary/50 pl-5"
                    >{data.description}</h6>
                )}
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

            {/* output */}
            {output && (
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
                        <h3 className="text-xs font-semibold">Output</h3>
                        {output.type &&
                            <div
                                className={cn(badgeVariants({
                                    variant: 'green',
                                    size: 'tiny',
                                }),
                                    'text-xs px-1 border-none')}
                            >
                                {getDisplayType(output.type)}
                            </div>
                        }
                    </div>
                    {output && <VariableCard variable={output} />}
                </div>
            )
            }

            {stepType === 'StepWiseUITextInput' && (
                <div className="flex flex-col gap-2 pt-2">
                    <div
                        className='flex gap-1 items-center'>
                        <Button
                            variant={"outline"}
                            size={"xxsIcon"}
                            className='w-4 h-4 m-0 p-0'
                        >
                            <FormInputIcon size={12} />
                        </Button>
                        <h3 className="text-xs font-semibold">Input</h3>
                    </div>
                    <textarea
                        onDrag={(e) => e.stopPropagation()}
                        className="border border-gray-300 rounded p-1 text-xs focus:border-accent/50 nodrag"
                        placeholder="Enter text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <Button
                        variant={"outline"}
                        size={"tiny"}
                        className="w-full hover:bg-accent/50"
                        onClick={() => {
                            if (output?.displayValue === inputText) return;
                            var variable = {
                                name: data.name,
                                type: 'String',
                                displayValue: inputText,
                            } as VariableDTO;
                            prop.data.onSubmitOutput(variable);
                        }}
                    >
                        Submit
                    </Button>
                </div>
            )
            }

        </div>
    );
};

export default StepNode;
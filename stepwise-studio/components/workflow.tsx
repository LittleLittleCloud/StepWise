// workflow component
// | [icon] [workflow name] |

import { cn } from '@/lib/utils';
import { WorkflowDTO } from '@/stepwise-client';
import React from 'react';
import { FaCog } from 'react-icons/fa';

interface WorkflowProps {
    dto: WorkflowDTO;
}

const Workflow: React.FC<WorkflowProps> = ({ dto }) => {
    return (
        <div className={cn('flex items-center p-4 shadow rounded-lg')}>
            <FaCog className={cn('text-gray-500 mr-4')} />
            <span className={cn('text-lg font-medium text-nowrap ')}>{dto.name}</span>
        </div>
    );
};

export default Workflow;
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-background text-foreground shadow hover:bg-background/50",
				destructive:
					"bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				outline: "m-0 p-0",
				secondary:
					"bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				disabled: "bg-background text-foreground/50 shadow-none",
			},
			size: {
				default: "h-9 px-4 py-2",
				tiny: "h-5 px-1 text-xxs",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-10 rounded-md px-8",
				icon: "h-9 w-9",
				smallIcon: "h-8 w-8",
				tinyIcon: "h-4 w-4",
				xxsIcon: "h-2 w-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	tooltip?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
	tooltipDelayDuration?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			tooltip,
			tooltipSide = "top",
			tooltipDelayDuration = 200,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		const buttonComponent = (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);

		if (tooltip) {
			return (
				<TooltipProvider>
					<Tooltip delayDuration={tooltipDelayDuration}>
						<TooltipTrigger asChild>
							<div>{buttonComponent}</div>
						</TooltipTrigger>
						<TooltipContent side={tooltipSide}>
							<p>{tooltip}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return buttonComponent;
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };

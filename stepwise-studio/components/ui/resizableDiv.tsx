import * as React from "react";
import { cn } from "@/lib/utils";
import { Slash } from "lucide-react";

export interface ResizableProps extends React.HTMLAttributes<HTMLDivElement> {
	minWidth: number;
	maxWidth: number;
	minHeight: number;
	maxHeight: number;
	defaultWidth: number;
	defaultHeight: number;
}

const ResizableDiv = React.forwardRef<HTMLDivElement, ResizableProps>(
	({ className, children, ...props }, ref) => {
		const [dimensions, setDimensions] = React.useState({
			width: props.defaultWidth,
			height: props.defaultHeight,
		});
		const [isResizing, setIsResizing] = React.useState(false);

		const startResize = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsResizing(true);
		}, []);

		const stopResize = React.useCallback(() => {
			setIsResizing(false);
		}, []);

		const resize = React.useCallback(
			(e: MouseEvent) => {
				if (isResizing) {
					const newWidth =
						e.clientX - (e.target as HTMLDivElement).getBoundingClientRect().left;
					const newHeight =
						e.clientY - (e.target as HTMLElement).getBoundingClientRect().top;
                    console.log(newWidth, newHeight);
					setDimensions({
						width: Math.max(props.minWidth, Math.min(props.maxWidth, newWidth)),
						height: Math.max(props.minHeight, Math.min(props.maxHeight, newHeight)),
					});
				}
			},
			[isResizing],
		);

		React.useEffect(() => {
			document.addEventListener("mousemove", resize);
			document.addEventListener("mouseup", stopResize);
			return () => {
				document.removeEventListener("mousemove", resize);
				document.removeEventListener("mouseup", stopResize);
			};
		}, [resize, stopResize]);

		return (
			<div
				ref={ref}
				className={cn(
					"relative bg-background border border-border rounded-lg shadow-sm overflow-hidden",
					className,
				)}
				style={{
					width: `${dimensions.width}px`,
					height: `${dimensions.height}px`,
				}}
				{...props}
			>
				{children}
				<div
					className="absolute bottom-0 right-0 w-2 h-2 bg-transparent cursor-se-resize nodrag"
					onMouseDown={startResize}
				>
                    <Slash size={6} />
                </div>
			</div>
		);
	},
);
ResizableDiv.displayName = "ResizableDiv";

export { ResizableDiv };

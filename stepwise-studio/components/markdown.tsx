import { ReactMarkdownProps } from "react-markdown/lib/complex-types";
import {
	ReactMarkdown,
	ReactMarkdownOptions,
} from "react-markdown/lib/react-markdown";
import { CodeBlock } from "./codeblock";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const Markdown = (
	props: ReactMarkdownOptions & { className?: string },
) => {
	return (
		<ReactMarkdown
			{...props}
			className={cn(
				"prose prose-default max-w-none rounded-md p-1 px-2 cursor-text",
				props.className ?? "",
			)}
			remarkPlugins={[remarkGfm]}
			components={{
				code: ({ node, inline, className, children, ...props }) => {
					const match = /language-(\w+)/.exec(className || "");
					return !inline && match ? (
						<CodeBlock
							language={match[1]}
							value={String(children).replace(/\n$/, "")}
							{...props}
						/>
					) : (
						<code {...props} className={className}>
							{children}
						</code>
					);
				},
				...props.components,
			}}
		>
			{props.children}
		</ReactMarkdown>
	);
};

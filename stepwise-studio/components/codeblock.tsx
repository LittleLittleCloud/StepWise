import { Download } from "lucide-react";
import { useTheme } from "next-themes";
import { FC, memo, useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
	oneDark,
	oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { CopyToClipboardIcon } from "./copy-to-clipboard-icon";

interface languageMap {
	[key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
	javascript: ".js",
	python: ".py",
	java: ".java",
	c: ".c",
	cpp: ".cpp",
	"c++": ".cpp",
	"c#": ".cs",
	ruby: ".rb",
	php: ".php",
	swift: ".swift",
	"objective-c": ".m",
	kotlin: ".kt",
	typescript: ".ts",
	go: ".go",
	perl: ".pl",
	rust: ".rs",
	scala: ".scala",
	haskell: ".hs",
	lua: ".lua",
	shell: ".sh",
	sql: ".sql",
	html: ".html",
	css: ".css",
	// add more file extensions here, make sure the key is same as language prop in CodeBlock.tsx component
};

export const generateRandomString = (length: number, lowercase = false) => {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789"; // excluding similar looking characters like Z, 2, I, 1, O, 0
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return lowercase ? result.toLowerCase() : result;
};

interface Props {
	language: string;
	value: string;
}

export const CodeBlock: FC<Props> = memo(({ language, value }) => {
	const [isCopied, setIsCopied] = useState<Boolean>(false);
	const [mounted, setMounted] = useState<Boolean>(false);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		setMounted(true);
	}, []);

	const downloadAsFile = () => {
		const fileExtension = programmingLanguages[language] || ".file";
		const suggestedFileName = `file-${generateRandomString(
			3,
			true,
		)}${fileExtension}`;
		const fileName = window.prompt("Enter file name", suggestedFileName);

		if (!fileName) {
			// user pressed cancel on prompt
			return;
		}

		const blob = new Blob([value], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.download = fileName;
		link.href = url;
		link.style.display = "none";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	return (
		<div className="relative bg-accent rounded-md overflow-hidden">
			<div className="flex items-center justify-between py-1.5 px-4">
				<span className="text-xs lowercase">{language}</span>

				<div className="flex items-center">
					<CopyToClipboardIcon textValue={value} />
					<button
						className="flex items-center rounded bg-none py-0.5 pl-2 text-xs focus:outline-none"
						onClick={downloadAsFile}
					>
						<Download size={18} />
					</button>
				</div>
			</div>
			<SyntaxHighlighter
				language={language}
				style={theme === "dark" ? oneDark : oneLight}
				customStyle={{ margin: 0 }}
			>
				{value}
			</SyntaxHighlighter>
		</div>
	);
});
CodeBlock.displayName = "CodeBlock";

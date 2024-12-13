import { ClipboardCheck, Clipboard } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { Button, buttonVariants } from "./ui/button";
import { VariantProps } from "class-variance-authority";

interface CopyToClipboardIconProps {
	textValue: string;
	size?: number;
	showCopiedText?: boolean;
	buttonVariants?: VariantProps<typeof buttonVariants>;
}

export const CopyToClipboardIcon: FC<CopyToClipboardIconProps> = ({
	textValue,
	size = 18,
	showCopiedText = true,
	buttonVariants,
}) => {
	const [isCopied, setIsCopied] = useState<Boolean>(false);
	const [valueToCopy, setValueToCopy] = useState<string>("");

	useEffect(() => {
		setValueToCopy(textValue);
	}, [textValue]);

	const copyToClipboard = () => {
		if (!navigator.clipboard || !navigator.clipboard.writeText) {
			return;
		}

		navigator.clipboard.writeText(valueToCopy).then(() => {
			setIsCopied(true);

			setTimeout(() => {
				setIsCopied(false);
			}, 2000);
		});
	};

	return (
		<Button
			variant={buttonVariants ? buttonVariants.variant : "ghost"}
			size={buttonVariants ? buttonVariants.size : "tinyIcon"}
			tooltip="Copy to clipboard"
			className="flex items-center rounded py-0.5 gap-1 text-xs focus:outline-none"
			onClick={copyToClipboard}
		>
			{isCopied ? <ClipboardCheck /> : <Clipboard />}
			{showCopiedText && <span>{isCopied ? "Copied!" : "Copy"}</span>}
		</Button>
	);
};

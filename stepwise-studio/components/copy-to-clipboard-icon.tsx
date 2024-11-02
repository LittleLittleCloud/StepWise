import { ClipboardCheck, Clipboard } from "lucide-react";
import { FC, useEffect, useState } from "react";

interface CopyToClipboardIconProps {
	textValue: string;
	size?: number;
	showCopiedText?: boolean;
}

export const CopyToClipboardIcon: FC<CopyToClipboardIconProps> = ({
	textValue,
	size = 18,
	showCopiedText = true,
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
		<button
			className="flex items-center rounded py-0.5 text-xs focus:outline-none"
			onClick={copyToClipboard}
		>
			{isCopied ? (
				<ClipboardCheck size={size} className="mr-1.5" />
			) : (
				<Clipboard size={size} className="mr-1.5" />
			)}
			{showCopiedText && <span>{isCopied ? "Copied!" : "Copy"}</span>}
		</button>
	);
};

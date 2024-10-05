import React, { useState, ChangeEvent } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	postApiV1StepWiseControllerV1UploadImage,
	StepWiseImage,
} from "@/stepwise-client";

interface UploadStatus {
	type: "success" | "error";
	message: string;
}

export interface ImageUploadProps {
	onUpload: (image: StepWiseImage) => void;
	onCanceled: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, onCanceled }) => {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState<boolean>(false);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		setFile(selectedFile || null);

		if (selectedFile) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreview(reader.result as string);
			};
			reader.readAsDataURL(selectedFile);
		} else {
			setPreview(null);
		}
	};

	const handleUpload = async () => {
		if (!file) return;

		setUploading(true);
		setUploadStatus(null);
		setUploading(false);

		const formData = new FormData();
		formData.append("image", file);

		try {
			const response = await postApiV1StepWiseControllerV1UploadImage({
				body: {
					image: file,
				},
			});

			if (response.data) {
				onUpload(response.data);
				setUploadStatus({
					type: "success",
					message: "Image uploaded successfully!",
				});
			} else {
				setUploadStatus({
					type: "error",
					message: "Failed to upload image. Please try again.",
				});
			}
		} catch (error) {
			setUploadStatus({
				type: "error",
				message: "An error occurred. Please try again.",
			});
		} finally {
			setUploading(false);
		}
	};

	const handleRemove = () => {
		setFile(null);
		setPreview(null);
		setUploadStatus(null);
		onCanceled();
	};

	return (
		<div className="max-w-md mx-auto p-2 rounded-lg shadow-md">
			{!preview && (
				<div className="mb-4">
					<Input
						type="file"
						accept="image/*"
						onChange={handleFileChange}
						className="hidden"
						id="imageInput"
					/>
					<label htmlFor="imageInput">
						<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary/60 transition-colors">
							<Upload className="mx-auto mb-2" size={15} />
							<h6 className="text-xs">
								Click to select an image
							</h6>
						</div>
					</label>
				</div>
			)}

			{preview && (
				<div className="mb-4 relative">
					<img
						src={preview}
						alt="Preview"
						className="w-full rounded-lg"
					/>
				</div>
			)}
			<div className="flex gap-2 justify-end">
				<Button
					variant="outline"
					size={"tiny"}
					onClick={handleUpload}
					className="bg-accent hover:bg-accent/50"
					disabled={!file || uploading}
				>
					{uploading ? "Uploading..." : "Submit"}
				</Button>
				<Button
					variant="destructive"
					size={"tiny"}
					onClick={handleRemove}
					disabled={!file || uploading}
				>
					Cancel
				</Button>
			</div>
			{/* 
			{uploadStatus && (
				<Alert
					className={`mt-4 ${uploadStatus.type === "success" ? "bg-green-100" : "bg-red-100"}`}
				>
					<AlertDescription>{uploadStatus.message}</AlertDescription>
				</Alert>
			)} */}
		</div>
	);
};

export default ImageUpload;

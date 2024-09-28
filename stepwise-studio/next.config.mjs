/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// generate static website
	output: "export",
	images: {
		unoptimized: true,
	},
};

export default nextConfig;

import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import { WorkflowDTO } from "@/stepwise-client";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const workflows : WorkflowDTO[] = [
  { name: "Workflow 1" },
  { name: "Workflow 2" },
  { name: "Workflow 3" },
];

export default function Home() {
  return (
    <div
      className={`bg-foreground w-full flex min-h-screen text-background ${geistSans} ${geistMono}`}
    >
        <Sidebar
          user="Test"
          workflows={workflows}/>
        <div className="flex flex-col items-center gap-8 w-full">
          <h1 className="text-4xl font-bold">Welcome to Stepwise Studio</h1>
        </div>
    </div>
  );
}

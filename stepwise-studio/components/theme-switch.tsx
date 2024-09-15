import { Label } from "@radix-ui/react-label";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "./ui/switch";

export function ThemeSwitch() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme, systemTheme } = useTheme()

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true)
        if (theme === null && systemTheme) {
            setTheme(systemTheme)
        }

        console.log("ThemeSwitch mounted")
        console.log("theme", theme)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <div className="flex items-center space-x-2 h-full">
            <Switch id="dark-mode" checked={theme === "dark"} onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                console.log("theme", theme)
            }} />
        </div>
    )
}

export default ThemeSwitch;
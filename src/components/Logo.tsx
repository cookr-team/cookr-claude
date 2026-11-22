import React from "react";
import { ICONS, PLATFORM_NAME } from "../constants";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "dark" | "light";
  showText?: boolean;
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({
  size = "md",
  className = "",
  variant = "dark",
  showText = true,
  onClick,
}) => {
  const sizes = {
    sm: {
      icon: 16,
      box: "w-8 h-8",
      text: "text-xl",
      gap: "gap-2",
      radius: "rounded-xl",
    },
    md: {
      icon: 20,
      box: "w-10 h-10",
      text: "text-2xl",
      gap: "gap-3",
      radius: "rounded-2xl",
    },
    lg: {
      icon: 24,
      box: "w-12 h-12",
      text: "text-3xl",
      gap: "gap-4",
      radius: "rounded-[1.2rem]",
    },
    xl: {
      icon: 32,
      box: "w-16 h-16",
      text: "text-4xl",
      gap: "gap-6",
      radius: "rounded-[1.5rem]",
    },
  };

  const currentSize = sizes[size];

  return (
    <div
      className={`flex items-center ${currentSize.gap} ${className} ${onClick ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
      onClick={onClick}
    >
      <div
        className={`${currentSize.box} bg-[#FF6B00] ${currentSize.radius} flex items-center justify-center shadow-sm`}
      >
        <ICONS.ChefHat className="text-white" size={currentSize.icon} />
      </div>
      {showText && (
        <span
          className={`${currentSize.text} font-black tracking-tighter ${variant === "light" ? "text-white" : "text-slate-950"}`}
        >
          {PLATFORM_NAME}
        </span>
      )}
    </div>
  );
};

export default React.memo(Logo);

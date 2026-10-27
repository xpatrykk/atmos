import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "../../lib/utils";

import type {ComponentProps} from "react";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
	{
		variants: {
			variant: {
				default: "bg-[var(--foreground)] text-[var(--background)] hover:opacity-85",
				outline: "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]",
				ghost: "hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)]",
			},
			size: {default: "h-9 px-3.5", sm: "h-8 px-3", icon: "size-8"},
		},
		defaultVariants: {variant: "default", size: "default"},
	}
);

export const Button = ({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?: boolean}) => {
	const Comp = asChild ? Slot : "button";
	return <Comp data-slot="button" className={cn(buttonVariants({variant, size, className}))} {...props} />;
};

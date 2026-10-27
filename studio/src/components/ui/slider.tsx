import * as SliderPrimitive from "@radix-ui/react-slider";

import type {ComponentProps} from "react";

export const Slider = ({
	"aria-label": ariaLabel,
	"aria-labelledby": labelledBy,
	...props
}: ComponentProps<typeof SliderPrimitive.Root>) => (
	<SliderPrimitive.Root className="slider" {...props}>
		<SliderPrimitive.Track className="slider-track">
			<SliderPrimitive.Range className="slider-range" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="slider-thumb" aria-label={ariaLabel} aria-labelledby={labelledBy} />
	</SliderPrimitive.Root>
);

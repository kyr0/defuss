import { jsx } from "defuss";

export const StaticHtml = (html: string) => 
	!html ? null : jsx('astro-static-slot', { dangerouslySetInnerHTML: { __html: html } });

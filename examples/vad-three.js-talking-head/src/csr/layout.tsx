
import type { Props } from "defuss";
import "../layouts/base.css";

export interface Meta {
	title: string;
}

export interface LayoutProps extends Props {
	meta: Meta;
}

export default function Layout({ children, meta }: LayoutProps) {
	return (
		<html lang="en" class="defuss-shadcn">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{meta.title}</title>
			</head>
			<body class="defuss-shadcn min-h-screen bg-background text-foreground antialiased">
				{children}
			</body>
		</html>
	)
}

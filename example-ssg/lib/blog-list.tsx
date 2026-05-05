import type { Props } from "defuss";
import type { ContentEntry } from "defuss-ssg";

export interface BlogListProps extends Props {
	entries: ContentEntry[];
}

const readMetaText = (
	meta: Record<string, unknown>,
	key: string,
): string | undefined => {
	const value = meta[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
};

const entryHref = (entry: ContentEntry): string => {
	if (!entry.route) {
		return `/${entry.slug}`;
	}

	return entry.route === "/" ? "/" : `${entry.route}.html`;
};

export default function BlogList({ entries }: BlogListProps) {
	if (entries.length === 0) {
		return <p>No blog entries found.</p>;
	}

	return (
		<ul>
			{entries.map((entry) => {
				const title =
					readMetaText(entry.meta, "title") || entry.slug || entry.relativePath;
				const summary = readMetaText(entry.meta, "summary");
				const date = readMetaText(entry.meta, "date");

				return (
					<li key={entry.filePath}>
						<article>
							<h2>
								<a href={entryHref(entry)}>{title}</a>
							</h2>
							{date ? <p><small>{date}</small></p> : null}
							{summary ? <p>{summary}</p> : null}
						</article>
					</li>
				);
			})}
		</ul>
	);
}
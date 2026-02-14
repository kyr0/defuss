import { createRef, type FC } from "defuss";

type TocItem = {
    id: string;
    label: string;
    children?: TocItem[];
};

const slugify = (value: string) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensureHeadingIds = (content: HTMLElement) => {
    const headings = Array.from(content.querySelectorAll("h1, h2, h3")) as HTMLHeadingElement[];
    const usedIds = new Set(Array.from(content.querySelectorAll("[id]")).map((element) => element.id));

    headings.forEach((heading) => {
        if (heading.id) return;

        const text = (heading.textContent || "").trim();
        if (!text) return;

        const base = slugify(text);
        if (!base) return;

        let id = base;
        let index = 1;
        while (usedIds.has(id)) {
            id = `${base}-${index}`;
            index += 1;
        }

        heading.id = id;
        usedIds.add(id);
    });
};

const collectTocItems = (): TocItem[] => {
    const content = document.getElementById("page-content");
    if (!content) {
        return [];
    }

    ensureHeadingIds(content);

    const headings = Array.from(content.querySelectorAll("h2[id], h3[id]")) as HTMLHeadingElement[];
    const h1 = content.querySelector("h1[id]") as HTMLHeadingElement | null;
    const items: TocItem[] = [];
    let currentH2: TocItem | null = null;

    headings.forEach((heading) => {
        const id = heading.id;
        const label = (heading.textContent || "").trim();
        if (!id || !label) return;

        if (heading.tagName.toLowerCase() === "h2") {
            currentH2 = { id, label, children: [] };
            items.push(currentH2);
            return;
        }

        if (heading.tagName.toLowerCase() === "h3") {
            if (!currentH2) {
                currentH2 = { id: "", label: "", children: [] };
                items.push(currentH2);
            }
            currentH2.children = currentH2.children || [];
            currentH2.children.push({ id, label });
        }
    });

    const filtered = items.filter((item) => item.id);

    if (filtered.length === 0 && h1?.id) {
        return [{ id: h1.id, label: (h1.textContent || "Overview").trim() || "Overview" }];
    }

    return filtered;
};

const buildList = (items: TocItem[]): HTMLUListElement => {
    const ul = document.createElement("ul");

    items.forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${item.id}`;
        a.textContent = item.label;
        li.appendChild(a);

        if (item.children && item.children.length > 0) {
            li.appendChild(buildList(item.children));
        }

        ul.appendChild(li);
    });

    return ul;
};

export const OnThisPage: FC = () => {
    const rootRef = createRef<HTMLDivElement>();
    const navRef = createRef<HTMLElement>();
    const listHostRef = createRef<HTMLDivElement>();
    let observer: MutationObserver | null = null;

    const refresh = () => {
        const items = collectTocItems();
        const nav = navRef.current;
        const listHost = listHostRef.current;

        if (!nav || !listHost) {
            return;
        }

        listHost.innerHTML = "";
        if (items.length === 0) {
            nav.classList.add("hidden");
            return;
        }

        nav.classList.remove("hidden");
        listHost.appendChild(buildList(items));
    };

    const onMount = () => {
        refresh();

        const content = document.getElementById("page-content");
        if (content) {
            observer = new MutationObserver(() => refresh());
            observer.observe(content, { childList: true, subtree: true, attributes: true });
        }

        window.addEventListener("hashchange", refresh);
        window.addEventListener("popstate", refresh);
    };

    const onUnmount = () => {
        observer?.disconnect();
        observer = null;
        window.removeEventListener("hashchange", refresh);
        window.removeEventListener("popstate", refresh);
    };

    return (
        <div ref={rootRef} class="hidden text-sm xl:block w-full max-w-[300px]" onMount={onMount} onUnmount={onUnmount}>
            <nav ref={navRef} class="hidden sticky top-22 space-y-2 [&_ul]:m-0 [&_ul]:list-none [&_ul_ul]:pl-4 [&_li]:mt-0 [&_li]:pt-2 [&_a]:inline-block [&_a]:no-underline [&_a]:transition-colors [&_a]:hover:text-foreground [&_a]:text-muted-foreground">
                <h4 class="font-medium">On This Page</h4>
                <div ref={listHostRef} />
            </nav>
        </div>
    );
};

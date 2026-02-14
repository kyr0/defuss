import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type ComboboxProps = ElementProps<HTMLDivElement> & {
    id?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    onValueChange?: (value: string) => void;
};

export type ComboboxOptionProps = ElementProps<HTMLDivElement> & {
    value: string;
};

const initCombobox = (component: HTMLDivElement, onValueChange?: (value: string) => void) => {
    const trigger = component.querySelector(':scope > button') as HTMLButtonElement;
    const triggerLabel = trigger?.querySelector(':scope > span') as HTMLSpanElement;
    const popover = component.querySelector(':scope > [data-popover]') as HTMLElement;
    const filter = popover?.querySelector('header input[role="combobox"]') as HTMLInputElement;
    const listbox = popover?.querySelector('[role="listbox"]') as HTMLElement;
    const allOptions = listbox ? Array.from(listbox.querySelectorAll('[role="option"]')) as HTMLElement[] : [];
    const options = allOptions.filter((option) => option.getAttribute("aria-disabled") !== "true");
    const hiddenInput = component.querySelector(':scope > input[type="hidden"]') as HTMLInputElement;

    if (!trigger || !triggerLabel || !popover || !filter || !listbox || !hiddenInput) {
        return;
    }

    if (!trigger.id && component.id) {
        trigger.id = `${component.id}-trigger`;
    }
    if (!popover.id && component.id) {
        popover.id = `${component.id}-popover`;
    }
    if (!listbox.id && component.id) {
        listbox.id = `${component.id}-listbox`;
    }

    trigger.setAttribute("aria-controls", listbox.id);
    listbox.setAttribute("aria-labelledby", trigger.id);

    const setVisible = (option: HTMLElement, visible: boolean) => {
        option.setAttribute("aria-hidden", String(!visible));
    };

    const filteredOptions = () => options.filter((o) => o.getAttribute("aria-hidden") !== "true");
    const getOptionValue = (option: HTMLElement) => option.dataset.value ?? option.textContent?.trim() ?? "";

    options.forEach((option, index) => {
        if (!option.id) {
            option.id = `${component.id}-option-${index}`;
        }
    });

    let activeIndex = -1;

    const setActive = (index: number) => {
        const visible = filteredOptions();
        options.forEach((option) => option.classList.remove("active"));
        activeIndex = index;
        if (activeIndex >= 0 && visible[activeIndex]) {
            visible[activeIndex].classList.add("active");
            trigger.setAttribute("aria-activedescendant", visible[activeIndex].id);
            visible[activeIndex].scrollIntoView({ block: "nearest" });
            return;
        }
        trigger.removeAttribute("aria-activedescendant");
    };

    const close = (focusTrigger = true) => {
        popover.setAttribute("aria-hidden", "true");
        trigger.setAttribute("aria-expanded", "false");
        filter.setAttribute("aria-expanded", "false");
        if (focusTrigger) {
            trigger.focus();
        }
        filter.value = "";
        allOptions.forEach((option) => setVisible(option, true));
        setActive(-1);
    };

    const open = () => {
        document.dispatchEvent(new CustomEvent("basecoat:popover", {
            detail: { source: component },
        }));

        popover.setAttribute("aria-hidden", "false");
        trigger.setAttribute("aria-expanded", "true");
        filter.setAttribute("aria-expanded", "true");
        filter.focus();

        const selected = options.find((option) => option.getAttribute("aria-selected") === "true");
        if (selected) {
            const visible = filteredOptions();
            setActive(Math.max(visible.indexOf(selected), 0));
        } else {
            setActive(0);
        }
    };

    const dispatchChange = (value: string) => {
        component.dispatchEvent(new CustomEvent("change", {
            detail: { value },
            bubbles: true,
        }));
    };

    const selectOption = (option: HTMLElement, triggerEvent = true) => {
        const value = getOptionValue(option);
        hiddenInput.value = value;
        triggerLabel.textContent = option.textContent ?? "";

        allOptions.forEach((candidate) => {
            if (candidate === option) {
                candidate.setAttribute("aria-selected", "true");
            } else {
                candidate.removeAttribute("aria-selected");
            }
        });

        onValueChange?.(value);
        if (triggerEvent) {
            dispatchChange(value);
        }
        close();
    };

    trigger.addEventListener("click", () => {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        if (expanded) {
            close();
        } else {
            open();
        }
    });

    filter.addEventListener("input", () => {
        const term = filter.value.trim().toLowerCase();
        allOptions.forEach((option) => {
            if (option.hasAttribute("data-force")) {
                setVisible(option, true);
                return;
            }
            const label = (option.dataset.filter || option.textContent || "").toLowerCase();
            const keywords = (option.dataset.keywords || "").toLowerCase();
            const visible = label.includes(term) || keywords.includes(term);
            setVisible(option, visible);
        });
        if (filteredOptions().length > 0) {
            setActive(0);
        } else {
            setActive(-1);
        }
    });

    const onKeyboard = (event: KeyboardEvent) => {
        if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;

        const isOpen = popover.getAttribute("aria-hidden") !== "true";

        if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) {
            event.preventDefault();
            open();
            return;
        }

        if (!isOpen) return;

        const visible = filteredOptions();
        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }

        if (visible.length === 0) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(Math.min(activeIndex + 1, visible.length - 1));
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const option = visible[Math.max(activeIndex, 0)];
            if (option) {
                selectOption(option);
            }
        }
    };

    trigger.addEventListener("keydown", onKeyboard);
    filter.addEventListener("keydown", onKeyboard);

    listbox.addEventListener("click", (event) => {
        const option = (event.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
        if (!option || option.getAttribute("aria-disabled") === "true") return;
        selectOption(option);
    });

    document.addEventListener("click", (event) => {
        if (!component.contains(event.target as Node)) {
            close(false);
        }
    });

    document.addEventListener("basecoat:popover", ((event: CustomEvent) => {
        if (event.detail.source !== component) {
            close(false);
        }
    }) as EventListener);

    const initialOption = options.find((option) => getOptionValue(option) === hiddenInput.value) || options[0];
    if (initialOption) {
        const value = getOptionValue(initialOption);
        hiddenInput.value = value;
        triggerLabel.textContent = initialOption.textContent ?? "";
        allOptions.forEach((candidate) => {
            if (candidate === initialOption) {
                candidate.setAttribute("aria-selected", "true");
            } else {
                candidate.removeAttribute("aria-selected");
            }
        });
    }

    (component as any).selectByValue = (value: string) => {
        const option = options.find((candidate) => getOptionValue(candidate) === value);
        if (option) {
            selectOption(option);
        }
    };

    popover.setAttribute("aria-hidden", "true");
    component.dataset.comboboxInitialized = "true";
    component.dispatchEvent(new CustomEvent("basecoat:initialized"));
};

export const Combobox: FC<ComboboxProps> = ({
    id,
    className,
    placeholder = "Select option",
    searchPlaceholder = "Search entries...",
    onValueChange,
    children,
    ...props
}) => {
    const rootRef = createRef<HTMLDivElement>();
    const comboboxId = id || `combobox-${Math.random().toString(36).slice(2, 9)}`;

    return (
        <div
            ref={rootRef}
            id={comboboxId}
            class={cn("select", className)}
            onMount={() => initCombobox(rootRef.current!, onValueChange)}
            {...props}
        >
            <button
                type="button"
                id={`${comboboxId}-trigger`}
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-controls={`${comboboxId}-listbox`}
                class="btn-outline w-full justify-between"
            >
                <span class="truncate">{placeholder}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground opacity-50 shrink-0">
                    <path d="m7 15 5 5 5-5" />
                    <path d="m7 9 5-5 5 5" />
                </svg>
            </button>
            <div id={`${comboboxId}-popover`} data-popover="" aria-hidden="true">
                <header>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        autocomplete="off"
                        autocorrect="off"
                        spellcheck={false}
                        aria-autocomplete="list"
                        role="combobox"
                        aria-expanded="false"
                        aria-controls={`${comboboxId}-listbox`}
                        aria-labelledby={`${comboboxId}-trigger`}
                    />
                </header>
                <div
                    role="listbox"
                    id={`${comboboxId}-listbox`}
                    aria-orientation="vertical"
                    aria-labelledby={`${comboboxId}-trigger`}
                    data-empty="No results found."
                >
                    {children}
                </div>
            </div>
            <input type="hidden" name={`${comboboxId}-value`} value="" />
        </div>
    );
};

export const ComboboxOption: FC<ComboboxOptionProps> = ({ className, value, children, ...props }) => (
    <div role="option" data-value={value} class={cn(className)} {...props}>
        {Array.isArray(children) ? (children.length > 0 ? children : value) : (children ?? value)}
    </div>
);

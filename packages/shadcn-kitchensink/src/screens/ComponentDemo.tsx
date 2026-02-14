import type { AsyncFC, FC } from "defuss";
import { Router } from "defuss";
import { ButtonScreen } from "./buttons/ButtonScreen.js";
import { BadgeScreen } from "./badge/BadgeScreen.js";
import { AlertScreen } from "./components/AlertScreen.js";
import { AlertDialogScreen } from "./components/AlertDialogScreen.js";
import { AccordionScreen } from "./components/AccordionScreen.js";
import { AvatarScreen } from "./components/AvatarScreen.js";
import { BreadcrumbScreen } from "./components/BreadcrumbScreen.js";
import { CardScreen } from "./components/CardScreen.js";
import { CheckboxScreen } from "./components/CheckboxScreen.js";
import { ComboboxScreen } from "./components/ComboboxScreen.js";
import { CommandScreen } from "./components/CommandScreen.js";
import { DialogScreen } from "./components/DialogScreen.js";
import { DropdownMenuScreen } from "./components/DropdownMenuScreen.js";
import { EmptyScreen } from "./components/EmptyScreen.js";
import { FormScreen } from "./components/FormScreen.js";
import { InputScreen } from "./components/InputScreen.js";
import { InputGroupScreen } from "./components/InputGroupScreen.js";
import { ItemScreen } from "./components/ItemScreen.js";
import { ButtonGroupScreen } from "./components/ButtonGroupScreen.js";
import { KbdScreen } from "./components/KbdScreen.js";
import { LabelScreen } from "./components/LabelScreen.js";
import { PaginationScreen } from "./components/PaginationScreen.js";
import { PopoverScreen } from "./components/PopoverScreen.js";
import { ProgressScreen } from "./components/ProgressScreen.js";
import { RadioGroupScreen } from "./components/RadioGroupScreen.js";
import { SelectScreen } from "./components/SelectScreen.js";
import { SidebarScreen } from "./components/SidebarScreen.js";
import { SliderScreen } from "./components/SliderScreen.js";
import { SkeletonScreen } from "./components/SkeletonScreen.js";
import { SpinnerScreen } from "./components/SpinnerScreen.js";
import { SwitchScreen } from "./components/SwitchScreen.js";
import { TableScreen } from "./components/TableScreen.js";
import { TabsScreen } from "./components/TabsScreen.js";
import { TextareaScreen } from "./components/TextareaScreen.js";
import { ToastScreen } from "./components/ToastScreen.js";
import { TooltipScreen } from "./components/TooltipScreen.js";

const COMPONENT_SCREENS: Record<string, FC> = {
    button: ButtonScreen,
    accordion: AccordionScreen,
    badge: BadgeScreen,
    alert: AlertScreen,
    "alert-dialog": AlertDialogScreen,
    avatar: AvatarScreen,
    breadcrumb: BreadcrumbScreen,
    card: CardScreen,
    checkbox: CheckboxScreen,
    combobox: ComboboxScreen,
    command: CommandScreen,
    dialog: DialogScreen,
    "dropdown-menu": DropdownMenuScreen,
    empty: EmptyScreen,
    form: FormScreen,
    input: InputScreen,
    "input-group": InputGroupScreen,
    item: ItemScreen,
    "button-group": ButtonGroupScreen,
    kbd: KbdScreen,
    label: LabelScreen,
    pagination: PaginationScreen,
    popover: PopoverScreen,
    progress: ProgressScreen,
    "radio-group": RadioGroupScreen,
    select: SelectScreen,
    sidebar: SidebarScreen,
    slider: SliderScreen,
    skeleton: SkeletonScreen,
    spinner: SpinnerScreen,
    switch: SwitchScreen,
    table: TableScreen,
    tabs: TabsScreen,
    textarea: TextareaScreen,
    toast: ToastScreen,
    tooltip: TooltipScreen,
};

/**
 * ComponentDemo - renders when /components/:name is matched.
 * Uses async pattern to wait for Router.ready() before accessing params.
 */
export const ComponentDemo: AsyncFC = async () => {
    await Router.ready();

    const req = Router.getRequest();
    const name = req.match && req.params.name ? req.params.name : "unknown";
    const Screen = COMPONENT_SCREENS[name];

    if (Screen) {
        return <Screen />;
    }

    const title = name === "unknown"
        ? "Unknown Component"
        : name
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
            <p class="text-xl text-muted-foreground">
                Demonstration for this component is not implemented yet.
            </p>
            <div class="border rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                <span class="text-muted-foreground italic">
                    Add a dedicated screen for <b>{name}</b> in <code>src/screens/components</code>.
                </span>
            </div>
        </div>
    );
};

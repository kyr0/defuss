import type { FC } from "defuss";
import {
    Button,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const DialogScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Dialog</h1>
            <p class="text-lg text-muted-foreground">A window overlaid on either the primary window or another dialog.</p>
                        <CodePreview code={`<DialogTrigger dialogId="demo-dialog-edit-profile" className="btn-outline">Edit Profile</DialogTrigger>
<Dialog id="demo-dialog-edit-profile" className="w-full sm:max-w-[425px] max-h-[612px]" aria-labelledby="demo-dialog-edit-profile-title" aria-describedby="demo-dialog-edit-profile-description">
    <DialogHeader>
        <DialogTitle id="demo-dialog-edit-profile-title">Edit profile</DialogTitle>
        <DialogDescription id="demo-dialog-edit-profile-description">Make changes to your profile here. Click save when you're done.</DialogDescription>
    </DialogHeader>
    <DialogContent>
        <form className="form grid gap-4">
            <div className="grid gap-3">
                <label htmlFor="demo-dialog-edit-profile-name">Name</label>
                <input type="text" value="Aron Homberg" id="demo-dialog-edit-profile-name" />
            </div>
            <div className="grid gap-3">
                <label htmlFor="demo-dialog-edit-profile-username">Username</label>
                <input type="text" value="@kyr0" id="demo-dialog-edit-profile-username" />
            </div>
        </form>
    </DialogContent>
    <DialogFooter>
        <DialogClose className="btn-outline">Cancel</DialogClose>
        <Button>Save changes</Button>
    </DialogFooter>
    <DialogClose aria-label="Close dialog">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    </DialogClose>
</Dialog>`} language="tsx">
                                <div>
                                        <DialogTrigger dialogId="demo-dialog-edit-profile" className="btn-outline">Edit Profile</DialogTrigger>
                                        <Dialog id="demo-dialog-edit-profile" className="w-full sm:max-w-[425px] max-h-[612px]" aria-labelledby="demo-dialog-edit-profile-title" aria-describedby="demo-dialog-edit-profile-description">
                                                <DialogHeader>
                                                        <DialogTitle id="demo-dialog-edit-profile-title">Edit profile</DialogTitle>
                                                        <DialogDescription id="demo-dialog-edit-profile-description">Make changes to your profile here. Click save when you're done.</DialogDescription>
                                                </DialogHeader>
                                                <DialogContent>
                                                        <form class="form grid gap-4">
                                                                <div class="grid gap-3">
                                                                        <label for="demo-dialog-edit-profile-name">Name</label>
                                                                        <input type="text" value="Aron Homberg" id="demo-dialog-edit-profile-name" />
                                                                </div>
                                                                <div class="grid gap-3">
                                                                        <label for="demo-dialog-edit-profile-username">Username</label>
                                                                        <input type="text" value="@kyr0" id="demo-dialog-edit-profile-username" />
                                                                </div>
                                                        </form>
                                                </DialogContent>
                                                <DialogFooter>
                                                        <DialogClose className="btn-outline">Cancel</DialogClose>
                                                        <Button>Save changes</Button>
                                                </DialogFooter>
                                                <DialogClose aria-label="Close dialog">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M18 6 6 18" />
                                                                <path d="m6 6 12 12" />
                                                        </svg>
                                                </DialogClose>
                                        </Dialog>
                                </div>
            </CodePreview>

                        <CodePreview code={`<button type="button" className="btn-outline" onClick={() => (document.getElementById("dialog-example") as HTMLDialogElement)?.showModal()}>Scrollable Content</button>
<dialog id="dialog-example" className="dialog w-full sm:max-w-[425px] max-h-[80vh]" aria-labelledby="dialog-example-title" aria-describedby="dialog-example-description" onClick={(event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}>
  <div>
    <header>
      <h2 id="dialog-example-title">Scrollable Content</h2>
      <p id="dialog-example-description">This is a dialog with scrollable content.</p>
    </header>
        <section className="max-h-[50vh] overflow-y-auto scrollbar pr-1">
      <div className="space-y-4 text-sm">...</div>
    </section>
    <footer>
            <form method="dialog">
                <button type="submit" className="btn-outline">Close</button>
            </form>
    </footer>
        <form method="dialog">
            <button type="submit" aria-label="Close dialog">...</button>
        </form>
  </div>
</dialog>`} language="tsx">
                <div class="space-y-4">
                    <button type="button" class="btn-outline" onClick={() => (document.getElementById("dialog-example") as HTMLDialogElement)?.showModal()}>Scrollable Content</button>
                                        <dialog id="dialog-example" class="dialog w-full sm:max-w-[425px] max-h-[80vh]" aria-labelledby="dialog-example-title" aria-describedby="dialog-example-description" onClick={(event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}>
                        <div>
                            <header>
                                <h2 id="dialog-example-title">Scrollable Content</h2>
                                <p id="dialog-example-description">This is a dialog with scrollable content.</p>
                            </header>

                                                        <section class="max-h-[50vh] overflow-y-auto scrollbar pr-1">
                                <div class="space-y-4 text-sm">
                                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                                    <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                                    <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                                                                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                                                        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                                                        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                                                                        <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                                                                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                                                        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                                                        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                                                                        <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                                </div>
                            </section>

                            <footer>
                                                                <form method="dialog">
                                                                        <button type="submit" class="btn-outline">Close</button>
                                                                </form>
                            </footer>

                                                        <form method="dialog">
                                                                <button type="submit" aria-label="Close dialog">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                                <path d="M18 6 6 18" />
                                                                                <path d="m6 6 12 12" />
                                                                        </svg>
                                                                </button>
                                                        </form>
                        </div>
                    </dialog>
                </div>
            </CodePreview>

            <CodePreview code={`<button type="button" className="btn-outline" onClick={() => (document.getElementById("demo-command-dialog") as HTMLDialogElement)?.showModal()}>
  Open command menu
  <kbd className="kbd">⌘J</kbd>
</button>

<dialog id="demo-command-dialog" className="command-dialog" aria-label="Command menu" onClick={(event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}>
  <div className="command">...</div>
</dialog>`} language="tsx">
                <div class="space-y-4">
                    <button type="button" class="btn-outline" onClick={() => (document.getElementById("demo-command-dialog") as HTMLDialogElement)?.showModal()}>
                        Open command menu
                        <kbd class="kbd">⌘J</kbd>
                    </button>

                    <dialog id="demo-command-dialog" class="command-dialog" aria-label="Command menu" onClick={(event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}>
                        <div class="command">
                            <header>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                <input type="text" id="demo-command-dialog-input" placeholder="Type a command or search..." autoComplete="off" autoCorrect="off" spellcheck={false} aria-autocomplete="list" role="combobox" aria-expanded="true" aria-controls="demo-command-dialog-menu" />
                            </header>
                            <div role="menu" id="demo-command-dialog-menu" aria-orientation="vertical" data-empty="No results found." class="scrollbar">
                                <div role="group" aria-labelledby="cmd-suggestions">
                                    <span role="heading" id="cmd-suggestions">Suggestions</span>
                                    <div role="menuitem"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg><span>Calendar</span></div>
                                    <div role="menuitem"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg><span>Search Emoji</span></div>
                                    <div role="menuitem" aria-disabled="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /></svg><span>Calculator</span></div>
                                </div>
                                <hr role="separator" />
                                <div role="group" aria-labelledby="cmd-settings">
                                    <span role="heading" id="cmd-settings">Settings</span>
                                    <div role="menuitem"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span>Profile</span><kbd class="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘P</kbd></div>
                                    <div role="menuitem"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg><span>Billing</span><kbd class="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘B</kbd></div>
                                    <div role="menuitem"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg><span>Settings</span><kbd class="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘S</kbd></div>
                                </div>
                            </div>
                            <form method="dialog">
                                <button type="submit" aria-label="Close dialog">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </form>
                        </div>
                    </dialog>
                </div>
            </CodePreview>
        </div>
    );
};

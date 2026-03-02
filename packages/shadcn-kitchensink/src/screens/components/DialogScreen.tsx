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
      <p class="text-lg text-muted-foreground">
        A window overlaid on either the primary window or another dialog.
      </p>
      <CodePreview
        code={`<DialogTrigger dialogId="demo-dialog-edit-profile" className="btn-outline">Edit Profile</DialogTrigger>
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
</Dialog>`}
        language="tsx"
      >
        <div>
          <DialogTrigger
            dialogId="demo-dialog-edit-profile"
            className="btn-outline"
          >
            Edit Profile
          </DialogTrigger>
          <Dialog
            id="demo-dialog-edit-profile"
            className="w-full sm:max-w-[425px] max-h-[612px]"
            aria-labelledby="demo-dialog-edit-profile-title"
            aria-describedby="demo-dialog-edit-profile-description"
          >
            <DialogHeader>
              <DialogTitle id="demo-dialog-edit-profile-title">
                Edit profile
              </DialogTitle>
              <DialogDescription id="demo-dialog-edit-profile-description">
                Make changes to your profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <DialogContent>
              <form class="form grid gap-4">
                <div class="grid gap-3">
                  <label for="demo-dialog-edit-profile-name">Name</label>
                  <input
                    type="text"
                    value="Aron Homberg"
                    id="demo-dialog-edit-profile-name"
                  />
                </div>
                <div class="grid gap-3">
                  <label for="demo-dialog-edit-profile-username">
                    Username
                  </label>
                  <input
                    type="text"
                    value="@kyr0"
                    id="demo-dialog-edit-profile-username"
                  />
                </div>
              </form>
            </DialogContent>
            <DialogFooter>
              <DialogClose className="btn-outline">Cancel</DialogClose>
              <Button>Save changes</Button>
            </DialogFooter>
            <DialogClose aria-label="Close dialog">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </DialogClose>
          </Dialog>
        </div>
      </CodePreview>

      <CodePreview
        code={`<button type="button" className="btn-outline" onClick={() => (document.getElementById("dialog-example") as HTMLDialogElement)?.showModal()}>Scrollable Content</button>
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
</dialog>`}
        language="tsx"
      >
        <div class="space-y-4">
          <button
            type="button"
            class="btn-outline"
            onClick={() =>
              (
                document.getElementById("dialog-example") as HTMLDialogElement
              )?.showModal()
            }
          >
            Scrollable Content
          </button>
          <dialog
            id="dialog-example"
            class="dialog w-full sm:max-w-[425px] max-h-[80vh]"
            aria-labelledby="dialog-example-title"
            aria-describedby="dialog-example-description"
            onClick={(event) => {
              if (event.target === event.currentTarget)
                (event.currentTarget as HTMLDialogElement).close();
            }}
          >
            <div>
              <header>
                <h2 id="dialog-example-title">Scrollable Content</h2>
                <p id="dialog-example-description">
                  This is a dialog with scrollable content.
                </p>
              </header>

              <section class="max-h-[50vh] overflow-y-auto scrollbar pr-1">
                <div class="space-y-4 text-sm">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                </div>
              </section>

              <footer>
                <form method="dialog">
                  <button type="submit" class="btn-outline">
                    Close
                  </button>
                </form>
              </footer>

              <form method="dialog">
                <button type="submit" aria-label="Close dialog">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </form>
            </div>
          </dialog>
        </div>
      </CodePreview>
    </div>
  );
};

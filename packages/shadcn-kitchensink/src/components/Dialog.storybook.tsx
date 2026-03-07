import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
} from "defuss-shadcn";
import type { StoryMeta } from "defuss-storybook";

export const meta: StoryMeta = {
  title: "Components/Dialog",
  order: 3,
  description: "Dialogs display content that requires user attention or interaction.",
};

/** Basic edit profile dialog */
export const EditProfile = () => (
  <>
    <DialogTrigger dialogId="story-dialog-profile" className="btn-outline">
      Edit Profile
    </DialogTrigger>
    <Dialog id="story-dialog-profile" className="w-full sm:max-w-[425px]"
      aria-labelledby="story-dialog-title" aria-describedby="story-dialog-desc">
      <DialogHeader>
        <DialogTitle id="story-dialog-title">Edit profile</DialogTitle>
        <DialogDescription id="story-dialog-desc">
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <form className="form grid gap-4">
          <div class="grid gap-2">
            <Label for="story-name">Name</Label>
            <Input id="story-name" value="Aron Homberg" />
          </div>
          <div class="grid gap-2">
            <Label for="story-email">Email</Label>
            <Input id="story-email" type="email" value="aron@example.com" />
          </div>
        </form>
      </DialogContent>
      <DialogFooter>
        <DialogClose className="btn-outline">Cancel</DialogClose>
        <Button>Save changes</Button>
      </DialogFooter>
    </Dialog>
  </>
);

/** Confirmation dialog */
export const Confirmation = () => (
  <>
    <DialogTrigger dialogId="story-dialog-confirm" className="btn btn-destructive">
      Delete Account
    </DialogTrigger>
    <Dialog id="story-dialog-confirm" className="w-full sm:max-w-[400px]"
      aria-labelledby="story-confirm-title" aria-describedby="story-confirm-desc">
      <DialogHeader>
        <DialogTitle id="story-confirm-title">Are you sure?</DialogTitle>
        <DialogDescription id="story-confirm-desc">
          This action cannot be undone. Your account and all data will be permanently deleted.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose className="btn-outline">Cancel</DialogClose>
        <Button variant="destructive">Delete</Button>
      </DialogFooter>
    </Dialog>
  </>
);

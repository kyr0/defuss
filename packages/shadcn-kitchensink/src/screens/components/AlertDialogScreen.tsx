import type { FC } from "defuss";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const AlertDialogScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Alert Dialog</h1>
            <p class="text-lg text-muted-foreground">A modal dialog that interrupts the user with important content and expects a response.</p>

            <CodePreview code={`<AlertDialogTrigger dialogId="alert-dialog" className="btn-outline">Open alert dialog</AlertDialogTrigger>

<AlertDialog id="alert-dialog" aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle id="alert-dialog-title">Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription id="alert-dialog-description">
        This action cannot be undone. This will permanently delete your account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <button className="btn-outline" onClick={() => (document.getElementById("alert-dialog") as HTMLDialogElement)?.close()}>Cancel</button>
      <button className="btn-primary" onClick={() => (document.getElementById("alert-dialog") as HTMLDialogElement)?.close()}>Continue</button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`} language="tsx">
                <>
                    <AlertDialogTrigger dialogId="alert-dialog" className="btn-outline">Open alert dialog</AlertDialogTrigger>

                    <AlertDialog id="alert-dialog" aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle id="alert-dialog-title">Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription id="alert-dialog-description">
                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                                <button class="btn-outline" onClick={() => (document.getElementById("alert-dialog") as HTMLDialogElement)?.close()}>Cancel</button>
                                <button class="btn-primary" onClick={() => (document.getElementById("alert-dialog") as HTMLDialogElement)?.close()}>Continue</button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            </CodePreview>
        </div>
    );
};

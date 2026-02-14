import type { FC } from "defuss";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const CardScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Card</h1>
            <p class="text-lg text-muted-foreground">Displays a card with header, content, and footer.</p>

                        <h2 id="example-login" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Login card</h2>
                        <CodePreview code={`<Card className="w-full max-w-sm">
    <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your details below to login to your account</CardDescription>
    </CardHeader>
    <CardContent>
        <form className="form grid gap-6">
            <div className="grid gap-2">
                <Label for="demo-card-form-email">Email</Label>
                <Input type="email" id="demo-card-form-email" />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center gap-2">
                    <Label for="demo-card-form-password">Password</Label>
                    <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">Forgot your password?</a>
                </div>
                <Input type="password" id="demo-card-form-password" />
            </div>
        </form>
    </CardContent>
    <CardFooter className="flex flex-col items-center gap-2">
        <Button className="w-full">Login</Button>
        <Button variant="outline" className="w-full">Login with Google</Button>
        <p className="mt-4 text-center text-sm">Don't have an account? <a href="#" className="underline-offset-4 hover:underline">Sign up</a></p>
    </CardFooter>
</Card>`} language="tsx">
                                <Card className="w-full max-w-sm">
                    <CardHeader>
                                                <CardTitle>Login to your account</CardTitle>
                                                <CardDescription>Enter your details below to login to your account</CardDescription>
                    </CardHeader>
                                        <CardContent>
                                                <form class="form grid gap-6">
                                                        <div class="grid gap-2">
                                                                <Label for="demo-card-form-email">Email</Label>
                                                                <Input type="email" id="demo-card-form-email" />
                                                        </div>
                                                        <div class="grid gap-2">
                                                                <div class="flex items-center gap-2">
                                                                        <Label for="demo-card-form-password">Password</Label>
                                                                        <a href="#" class="ml-auto inline-block text-sm underline-offset-4 hover:underline">Forgot your password?</a>
                                                                </div>
                                                                <Input type="password" id="demo-card-form-password" />
                                                        </div>
                                                </form>
                                        </CardContent>
                                        <CardFooter className="flex flex-col items-center gap-2">
                                                <Button className="w-full">Login</Button>
                                                <Button variant="outline" className="w-full">Login with Google</Button>
                                                <p class="mt-4 text-center text-sm">Don't have an account? <a href="#" class="underline-offset-4 hover:underline">Sign up</a></p>
                                        </CardFooter>
                </Card>
            </CodePreview>
        </div>
    );
};

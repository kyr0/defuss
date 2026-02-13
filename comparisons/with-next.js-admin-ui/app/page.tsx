import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/admin/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const showInvalidCredentials = params.error === "invalid_credentials";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Logo size={40} />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="text-center">
              <h1 className="text-2xl font-semibold">Sign in to your account</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your credentials below to access the admin panel.
              </p>
            </div>

            <form action="/api/auth/login" method="post" className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>

              {showInvalidCredentials ? (
                <p className="text-sm text-destructive">
                  Invalid email or password.
                </p>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox id="remember" />
                  Remember me
                </label>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  Can&apos;t login?
                </Link>
              </div>

              <Button className="w-full" type="submit">
                Sign in
              </Button>

              <div className="relative text-center text-xs text-muted-foreground">
                <span className="bg-background px-2">Or</span>
                <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
              </div>

              <Button variant="outline" className="w-full">
                Continue with Google
              </Button>
            </form>

            <Card className="mt-6 border-dashed">
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-semibold">Demo user</p>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Email</span>
                  <span className="font-mono">jane.smith@acme.com</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Password</span>
                  <span className="font-mono">Password123!</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1617609277590-ec2d145ca13b?q=80&w=2333&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

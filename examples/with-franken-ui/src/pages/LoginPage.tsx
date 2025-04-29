import UIkit from "uikit";
import { createRef, a$ } from "defuss";

export function LoginPage() {

  const signInBtnRef = createRef();
  const continueWithGoogleBtnRef = createRef();
  const formRef = createRef();

  a$(signInBtnRef).on('click', async() => {
    console.log('signInBtnRef clicked');
    const values = await a$(formRef).form()
    console.log('values', values);

    const notification = UIkit.notification("MyMessage", "destructive");
    console.log('notification', notification);
  })

  a$('.grid').debug((x) => {
    console.log('grid.min-h-svh.lg:grid-cols-2', x);
  })

  return (
    <div class="grid min-h-svh lg:grid-cols-2">
      <div class="flex flex-col gap-4 p-6 md:p-10">
        <div class="flex justify-between">
          <div class="flex justify-center md:justify-start">
            <a href="#">
              <img src="/defuss_mascott.png" width="80px" alt="defuss logo" />
            </a>
          </div>
          <div class="flex justify-center md:justify-end">
            <button class="uk-btn uk-btn-default" type="button">
              <div class="size-4">
                <uk-icon icon="smile"></uk-icon>
              </div>
            </button>
            <div class="uk-drop uk-dropdown min-w-52" data-uk-dropdown="mode: click">
              <ul class="uk-nav uk-dropdown-nav p-4 bg-light rounded-lg shadow-md">
                <uk-theme-switcher>
                  <select hidden class="p-2 rounded-md border border-gray-300">
                    <optgroup data-key="theme" label="Theme" class="p-2">
                      <option data-hex="#52525b" value="uk-theme-zinc" selected>Zinc</option>
                      <option data-hex="#64748b" value="uk-theme-slate">Slate</option>
                      <option data-hex="#78716c" value="uk-theme-stone">Stone</option>
                      <option data-hex="#6b7280" value="uk-theme-gray">Gray</option>
                      <option data-hex="#737373" value="uk-theme-neutral">Neutral</option>
                      <option data-hex="#dc2626" value="uk-theme-red">Red</option>
                      <option data-hex="#e11d48" value="uk-theme-rose">Rose</option>
                      <option data-hex="#f97316" value="uk-theme-orange">Orange</option>
                      <option data-hex="#16a34a" value="uk-theme-green">Green</option>
                      <option data-hex="#2563eb" value="uk-theme-blue">Blue</option>
                      <option data-hex="#facc15" value="uk-theme-yellow">Yellow</option>
                      <option data-hex="#7c3aed" value="uk-theme-violet">Violet</option>
                    </optgroup>

                    <optgroup data-key="mode" label="Mode" class="p-2">
                      <option data-icon="sun" value="light">Light</option>
                      <option data-icon="moon" value="dark">Dark</option>
                    </optgroup>
                  </select>
                </uk-theme-switcher>
              </ul>
            </div>
          </div>
        </div>
        <div class="flex flex-1 items-center justify-center">
          <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="uk-h4">Sign in to your account</h1>
              <p class="text-muted-foreground">
                Enter your credentials below to login to your account.
              </p>
            </div>
            <form class="mt-6 space-y-6" action="#" ref={formRef} method="POST">
              <div class="uk-alert uk-alert-destructive">
                There were errors in your submission.
              </div>
              <div class="grid gap-y-1">
                <label class="uk-form-label text-destructive" for="email">
                  Email
                </label>
                <input
                  class="uk-input uk-form-destructive"
                  id="email"
                  name="email"
                  type="text"
                  placeholder="john@example.com"
                />
                <div class="uk-anmt-shake uk-form-help text-destructive">
                  The email field is required.
                </div>
              </div>
              <div class="grid gap-y-1">
                <label class="uk-form-label" for="password">Password</label>
                <input
                  class="uk-input"
                  id="password"
                  type="password"
                  placeholder="Password"
                />
              </div>
              <div class="uk-text-small flex justify-between">
                <label for="remember">
                  <input name="remember" type="hidden" value="0" />
                  <input
                    class="uk-checkbox mr-1"
                    id="remember"
                    name="remember"
                    type="checkbox"
                    value="1"
                  />
                  Remember me
                </label>
                <a class="uk-link" href="#"> Can't login? </a>
              </div>
              <button class="uk-btn uk-btn-primary block w-full" type='button' ref={signInBtnRef} >
                Sign in
              </button>
              <div
                class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border"
              >
                <span
                  class="text-muted-foreground relative z-10 bg-background px-2"
                >
                  Or
                </span>
              </div>
              <button ref={continueWithGoogleBtnRef} class="uk-btn uk-btn-default w-full" type='button'>
                Continue with Google
              </button>
            </form>
          </div>
        </div>
      </div>

      <div class="relative bg-muted lg:block">
        <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1617609277590-ec2d145ca13b?q=80&w=2333&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-muted to-transparent"></div>    
      </div>
    </div>
  )
}
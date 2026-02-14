import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const FormScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Form</h1>
            <p class="text-lg text-muted-foreground">Build forms with Basecoat-compatible styles and structure.</p>
                        <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Complete form</h2>
                        <CodePreview code={`<form className="form grid gap-6">
    <div className="grid gap-2">
        <label htmlFor="demo-form-text">Username</label>
        <input type="text" id="demo-form-text" placeholder="hunvreus" />
        <p className="text-muted-foreground text-sm">This is your public display name.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-select">Email</label>
        <select id="demo-form-select">
            <option value="bob@example.com">m@example.com</option>
            <option value="alice@example.com">m@google.com</option>
            <option value="john@example.com">m@support.com</option>
        </select>
        <p className="text-muted-foreground text-sm">You can manage email addresses in your email settings.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-textarea">Bio</label>
        <textarea id="demo-form-textarea" placeholder="I like to..." rows={3}></textarea>
        <p className="text-muted-foreground text-sm">You can @mention other users and organizations.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-date">Date of birth</label>
        <input type="date" id="demo-form-date" />
        <p className="text-muted-foreground text-sm">Your date of birth is used to calculate your age.</p>
    </div>

    <div className="flex flex-col gap-3">
        <label htmlFor="demo-form-radio">Notify me about...</label>
        <fieldset id="demo-form-radio" className="grid gap-3">
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="1" checked />All new messages</label>
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="2" />Direct messages and mentions</label>
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="3" />Nothing</label>
        </fieldset>
    </div>

    <section className="grid gap-4">
        <h3 className="text-lg font-medium">Email Notifications</h3>
        <div className="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
            <div className="flex flex-col gap-0.5">
                <label htmlFor="demo-form-switch" className="leading-normal">Marketing emails</label>
                <p className="text-muted-foreground text-sm">Receive emails about new products, features, and more.</p>
            </div>
            <input type="checkbox" id="demo-form-switch" role="switch" />
        </div>
        <div className="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
            <div className="flex flex-col gap-0.5 opacity-60">
                <label htmlFor="demo-form-switch-disabled" className="leading-normal">Security emails</label>
                <p className="text-muted-foreground text-sm">Receive emails about your account security.</p>
            </div>
            <input type="checkbox" id="demo-form-switch-disabled" role="switch" disabled />
        </div>
    </section>

    <button type="submit" className="btn">Submit</button>
</form>`} language="tsx">
                                <form class="form grid gap-6">
                                        <div class="grid gap-2">
                                                <label for="demo-form-text">Username</label>
                                                <input type="text" id="demo-form-text" placeholder="hunvreus" />
                                                <p class="text-muted-foreground text-sm">This is your public display name.</p>
                                        </div>

                                        <div class="grid gap-2">
                                                <label for="demo-form-select">Email</label>
                                                <select id="demo-form-select">
                                                        <option value="bob@example.com">m@example.com</option>
                                                        <option value="alice@example.com">m@google.com</option>
                                                        <option value="john@example.com">m@support.com</option>
                                                </select>
                                                <p class="text-muted-foreground text-sm">You can manage email addresses in your email settings.</p>
                                        </div>

                                        <div class="grid gap-2">
                                                <label for="demo-form-textarea">Bio</label>
                                                <textarea id="demo-form-textarea" placeholder="I like to..." rows="3"></textarea>
                                                <p class="text-muted-foreground text-sm">You can @mention other users and organizations.</p>
                                        </div>

                                        <div class="grid gap-2">
                                                <label for="demo-form-date">Date of birth</label>
                                                <input type="date" id="demo-form-date" />
                                                <p class="text-muted-foreground text-sm">Your date of birth is used to calculate your age.</p>
                                        </div>

                                        <div class="flex flex-col gap-3">
                                                <label for="demo-form-radio">Notify me about...</label>
                                                <fieldset id="demo-form-radio" class="grid gap-3">
                                                        <label class="font-normal"><input type="radio" name="demo-form-radio" value="1" checked />All new messages</label>
                                                        <label class="font-normal"><input type="radio" name="demo-form-radio" value="2" />Direct messages and mentions</label>
                                                        <label class="font-normal"><input type="radio" name="demo-form-radio" value="3" />Nothing</label>
                                                </fieldset>
                                        </div>

                                        <section class="grid gap-4">
                                                <h3 class="text-lg font-medium">Email Notifications</h3>
                                                <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
                                                        <div class="flex flex-col gap-0.5">
                                                                <label for="demo-form-switch" class="leading-normal">Marketing emails</label>
                                                                <p class="text-muted-foreground text-sm">Receive emails about new products, features, and more.</p>
                                                        </div>
                                                        <input type="checkbox" id="demo-form-switch" role="switch" />
                                                </div>
                                                <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
                                                        <div class="flex flex-col gap-0.5 opacity-60">
                                                                <label for="demo-form-switch-disabled" class="leading-normal">Security emails</label>
                                                                <p class="text-muted-foreground text-sm">Receive emails about your account security.</p>
                                                        </div>
                                                        <input type="checkbox" id="demo-form-switch-disabled" role="switch" disabled />
                                                </div>
                                        </section>

                                        <button type="submit" class="btn">Submit</button>
                                </form>
            </CodePreview>

                        <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Demonstrating field</h2>
                        <CodePreview code={`<form className="w-full max-w-md space-y-6">
    <fieldset className="fieldset">
        <legend>Payment Method</legend>
        <p>All transactions are secure and encrypted</p>

        <div role="group" className="field">
            <label htmlFor="card-name">Name on Card</label>
            <input id="card-name" type="text" placeholder="Evil Rabbit" required />
        </div>

        <div role="group" className="field">
            <label htmlFor="card-number">Card Number</label>
            <input id="card-number" type="text" placeholder="1234 5678 9012 3456" aria-describedby="card-number-desc" required />
            <p id="card-number-desc">Enter your 16-digit card number</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
            <div role="group" className="field">
                <label htmlFor="exp-month">Month</label>
                <select id="exp-month" className="select w-full">
                    <option value="">MM</option><option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option><option value="05">05</option><option value="06">06</option><option value="07">07</option><option value="08">08</option><option value="09">09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
                </select>
            </div>
            <div role="group" className="field">
                <label htmlFor="exp-year">Year</label>
                <select id="exp-year" className="select w-full">
                    <option value="">YYYY</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option><option value="2029">2029</option>
                </select>
            </div>
            <div role="group" className="field">
                <label htmlFor="cvv">CVV</label>
                <input id="cvv" type="text" placeholder="123" required />
            </div>
        </div>
    </fieldset>

    <hr role="separator" className="my-6 border-border" />

    <fieldset className="fieldset">
        <legend>Billing Address</legend>
        <p>The billing address associated with your payment method</p>
        <div role="group" className="field">
            <label htmlFor="same-as-shipping" className="gap-3">
                <input type="checkbox" id="same-as-shipping" checked />
                Same as shipping address
            </label>
        </div>
    </fieldset>

    <fieldset className="fieldset">
        <div role="group" className="field">
            <label htmlFor="comments">Comments</label>
            <textarea id="comments" placeholder="Add any additional comments" rows={3}></textarea>
        </div>
    </fieldset>

    <div className="flex gap-3">
        <button type="submit" className="btn">Submit</button>
        <button type="button" className="btn-outline">Cancel</button>
    </div>
</form>`} language="tsx">
                                <form class="w-full max-w-md space-y-6">
                                        <fieldset class="fieldset">
                                                <legend>Payment Method</legend>
                                                <p>All transactions are secure and encrypted</p>

                                                <div role="group" class="field">
                                                        <label for="card-name">Name on Card</label>
                                                        <input id="card-name" type="text" placeholder="Evil Rabbit" required />
                                                </div>

                                                <div role="group" class="field">
                                                        <label for="card-number">Card Number</label>
                                                        <input id="card-number" type="text" placeholder="1234 5678 9012 3456" aria-describedby="card-number-desc" required />
                                                        <p id="card-number-desc">Enter your 16-digit card number</p>
                                                </div>

                                                <div class="grid grid-cols-3 gap-4">
                                                        <div role="group" class="field">
                                                                <label for="exp-month">Month</label>
                                                                <select id="exp-month" class="select w-full">
                                                                        <option value="">MM</option><option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option><option value="05">05</option><option value="06">06</option><option value="07">07</option><option value="08">08</option><option value="09">09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
                                                                </select>
                                                        </div>
                                                        <div role="group" class="field">
                                                                <label for="exp-year">Year</label>
                                                                <select id="exp-year" class="select w-full">
                                                                        <option value="">YYYY</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option><option value="2029">2029</option>
                                                                </select>
                                                        </div>
                                                        <div role="group" class="field">
                                                                <label for="cvv">CVV</label>
                                                                <input id="cvv" type="text" placeholder="123" required />
                                                        </div>
                                                </div>
                                        </fieldset>

                                        <hr role="separator" class="my-6 border-border" />

                                        <fieldset class="fieldset">
                                                <legend>Billing Address</legend>
                                                <p>The billing address associated with your payment method</p>
                                                <div role="group" class="field">
                                                        <label for="same-as-shipping" class="gap-3">
                                                                <input type="checkbox" id="same-as-shipping" checked />
                                                                Same as shipping address
                                                        </label>
                                                </div>
                                        </fieldset>

                                        <fieldset class="fieldset">
                                                <div role="group" class="field">
                                                        <label for="comments">Comments</label>
                                                        <textarea id="comments" placeholder="Add any additional comments" rows="3"></textarea>
                                                </div>
                                        </fieldset>

                                        <div class="flex gap-3">
                                                <button type="submit" class="btn">Submit</button>
                                                <button type="button" class="btn-outline">Cancel</button>
                                        </div>
                                </form>
                        </CodePreview>
        </div>
    );
};

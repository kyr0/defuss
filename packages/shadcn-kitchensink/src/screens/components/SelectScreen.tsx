import type { FC } from "defuss";
import { Select } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SelectScreen: FC = () => {
	return (
		<div class="space-y-6">
			<h1 class="text-3xl font-bold tracking-tight">Select</h1>
			<p class="text-lg text-muted-foreground">Displays a select control.</p>
			<CodePreview code={`<Select className="w-full max-w-sm">
  <option value="">Select a fruit</option>
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="orange">Orange</option>
</Select>`} language="tsx">
				<Select className="w-full max-w-sm">
					<option value="">Select a fruit</option>
					<option value="apple">Apple</option>
					<option value="banana">Banana</option>
					<option value="orange">Orange</option>
				</Select>
			</CodePreview>
		</div>
	);
};

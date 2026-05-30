export interface SelectionModelOptions {
	desktopElement: HTMLElement;
	iconsContainer: HTMLElement;
}

export class SelectionModel {
	public selectionDiv: HTMLDivElement | null = null;
	public startX = 0;
	public startY = 0;
	public debounceTimer: number | null = null;
	public isSelecting = false;
	public debounceDelay = 1;

	constructor(public options: SelectionModelOptions) { }

	init(): void {
		this.options.desktopElement.addEventListener("mousedown", this.onMouseDown);
	}

	destroy(): void {
	  this.options.desktopElement.removeEventListener("mousedown", this.onMouseDown);
	  this.removeSelectionDiv();
	  this.clearDebounce();
	  document.removeEventListener("mousemove", this.onMouseMove);
	  document.removeEventListener("mouseup", this.onMouseUp);
	  document.documentElement.removeEventListener("mouseleave", this.onMouseLeave);
	}

	public onMouseDown = (e: MouseEvent): void => {
		if ((e.target as HTMLElement).closest(".desktop-icon")) return;
		this.startX = e.clientX;
		this.startY = e.clientY;
		this.isSelecting = true;
		this.createSelectionDiv();
		document.addEventListener("mousemove", this.onMouseMove);
		document.addEventListener("mouseup", this.onMouseUp);
		document.documentElement.addEventListener("mouseleave", this.onMouseLeave);
	};

	public onMouseMove = (e: MouseEvent): void => {
		if (!this.isSelecting) return;
		this.clearDebounce();
		this.debounceTimer = window.setTimeout(() => {
			this.updateSelectionDiv(e.clientX, e.clientY);
			this.selectIcons();
		}, this.debounceDelay);
	};

	public onMouseUp = (): void => {
		this.endSelection();
	};

	public onMouseLeave = (): void => {
		this.endSelection();
	};

	endSelection = (): void => {
		if (!this.isSelecting) return;
		this.isSelecting = false;
		this.clearDebounce();
		this.selectIcons();
		this.removeSelectionDiv();
		document.removeEventListener("mousemove", this.onMouseMove);
		document.removeEventListener("mouseup", this.onMouseUp);
		document.documentElement.removeEventListener("mouseleave", this.onMouseLeave);
	};

	public createSelectionDiv(): void {
		this.selectionDiv = document.createElement("div");
		this.selectionDiv.className = "selection-model";
		this.selectionDiv.style.left = `${this.startX}px`;
		this.selectionDiv.style.top = `${this.startY}px`;
		this.selectionDiv.style.width = "0px";
		this.selectionDiv.style.height = "0px";
		document.body.appendChild(this.selectionDiv);
	}

	public updateSelectionDiv(endX: number, endY: number): void {
		if (!this.selectionDiv) return;
		const left = Math.min(this.startX, endX);
		const top = Math.min(this.startY, endY);
		const width = Math.abs(endX - this.startX);
		const height = Math.abs(endY - this.startY);
		this.selectionDiv.style.left = `${left}px`;
		this.selectionDiv.style.top = `${top}px`;
		this.selectionDiv.style.width = `${width}px`;
		this.selectionDiv.style.height = `${height}px`;
	}

	public selectIcons(): void {
		const icons = this.options.iconsContainer.querySelectorAll(".desktop-icon");
		if (!this.selectionDiv) return;
		const selRect = this.selectionDiv.getBoundingClientRect();
		icons.forEach((icon) => {
			const iconRect = icon.getBoundingClientRect();
			const intersects = !(
				iconRect.right < selRect.left ||
				iconRect.left > selRect.right ||
				iconRect.bottom < selRect.top ||
				iconRect.top > selRect.bottom
			);
			if (intersects) {
				icon.classList.add("icon-selected");
			} else {
				icon.classList.remove("icon-selected");
			}
		});
	}

	public removeSelectionDiv(): void {
		if (this.selectionDiv) {
			this.selectionDiv.remove();
			this.selectionDiv = null;
		}
	}

	public clearDebounce(): void {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}
}

import { createRef, type Props, T, Router, type Ref } from "defuss";

export interface NavigationMenuRef {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
}

export interface NavigationMenuProps extends Props {
	isOpen?: boolean;
	onClose?: () => void;
}

export function NavigationMenu({
	isOpen = false,
	onClose,
	ref = createRef<NavigationMenuRef, HTMLDivElement>(),
}: NavigationMenuProps) {
	const overlayRef = createRef<HTMLDivElement>();
	const menuRef = createRef<HTMLDivElement>();

	console.log("NavigationMenu props:", { isOpen, onClose });

	function handleClose() {
		ref.state.isOpen = false;
		menuRef.current?.classList.add("-translate-x-full");
		overlayRef.current?.classList.add("opacity-0", "pointer-events-none");
		overlayRef.current?.classList.remove("opacity-100");
		document.body.style.overflow = "";
		onClose?.();
	}

	function handleMenuItemClick(path: string) {
		Router.navigate(path);
		handleClose();
	}

	function handleLogout() {
		// TODO: Implement actual logout logic
		console.log("Logout clicked");
		Router.navigate("/login");
		handleClose();
	}

	function handleOpen() {
		ref.state.isOpen = true;

		menuRef.current?.classList.remove("-translate-x-full");
		overlayRef.current?.classList.remove("opacity-0", "pointer-events-none");
		overlayRef.current?.classList.add("opacity-100");
		document.body.style.overflow = "hidden";
	}

	function handleToggle() {
		ref.state.isOpen = !ref.state.isOpen;
		if (ref.state.isOpen) {
			handleOpen();
		} else {
			handleClose();
		}
	}

	ref.state = {
		isOpen: isOpen,
		open: handleOpen,
		close: handleClose,
		toggle: handleToggle,
	};

	console.log("NavigationMenu rendered", ref.state);

	return (
		<div ref={ref}>
			{/* Overlay */}
			<div
				ref={overlayRef}
				class={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
				onClick={handleClose}
				onKeyDown={(e) => e.key === "Escape" && handleClose()}
				role="button"
				tabIndex={0}
			/>

			{/* Menu */}
			<div
				ref={menuRef}
				class={`navigation-menu fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white shadow-xl z-50 p-6 space-y-6 transition-transform duration-300 transform ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Header */}
				<div class="flex items-center justify-between mb-8">
					<span class="font-bold text-xl text-amber-700">
						LIGHT IN A BOTTLE
					</span>
					<button type="button" class="p-2" onClick={handleClose}>
						<span class="material-icons text-gray-600 text-3xl">close</span>
					</button>
				</div>

				{/* Navigation */}
				<nav class="space-y-2">
					<button
						type="button"
						class="menu-item w-full flex items-center space-x-3 p-3 rounded-lg text-left"
						onClick={() => handleMenuItemClick("/dashboard")}
					>
						<span class="material-icons text-amber-500">home</span>
						<span class="text-gray-700">
							<T key="navigation.home" fallback="Home" />
						</span>
					</button>

					<button
						type="button"
						class="menu-item w-full flex items-center space-x-3 p-3 rounded-lg text-left"
						onClick={() => handleMenuItemClick("/profile")}
					>
						<span class="material-icons text-amber-500">person</span>
						<span class="text-gray-700">
							<T key="navigation.profile" fallback="Profile" />
						</span>
					</button>

					<button
						type="button"
						class="menu-item w-full flex items-center space-x-3 p-3 rounded-lg text-left"
						onClick={() => handleMenuItemClick("/settings")}
					>
						<span class="material-icons text-amber-500">settings</span>
						<span class="text-gray-700">
							<T key="navigation.settings" fallback="Settings" />
						</span>
					</button>

					<button
						type="button"
						class="menu-item w-full flex items-center space-x-3 p-3 rounded-lg text-left"
						onClick={() => handleMenuItemClick("/help")}
					>
						<span class="material-icons text-amber-500">help_outline</span>
						<span class="text-gray-700">
							<T key="navigation.help" fallback="Help" />
						</span>
					</button>

					<button
						type="button"
						class="menu-item w-full flex items-center space-x-3 p-3 rounded-lg text-left"
						onClick={handleLogout}
					>
						<span class="material-icons text-amber-500">logout</span>
						<span class="text-gray-700">
							<T key="navigation.logout" fallback="Logout" />
						</span>
					</button>
				</nav>

				{/* Version */}
				<div class="absolute bottom-6 left-6 text-xs text-gray-500">
					Version 1.0.0
				</div>
			</div>
		</div>
	);
}

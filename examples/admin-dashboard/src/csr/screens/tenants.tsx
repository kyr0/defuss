import { $, createRef } from "defuss";
import type { RouteProps } from "defuss";
import { createDataview, applyDataview } from "defuss-dataview";
import { setHeaders } from "defuss-rpc/client.js";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	DataTable,
	type DataTableColumn,
	toast,
} from "defuss-shadcn";
import { getRpcClient } from "../lib/rpc-client";
import type { Tenant, TenantPlan } from "../../models/tenant.js";
import { AdminLayout } from "../layouts/admin.js";
import { DataTableSkeleton } from "../components/data-table-skeleton";
import { NavGuard } from "../components/nav-guard";
import { t } from "../i18n";

/**
 * Tenant management screen with searchable data table,
 * create/edit dialog, and delete confirmation with cascade warning.
 */
export function TenantsScreen({ route }: RouteProps) {
	const tenantsRef = createRef<HTMLElement, { tenants: Tenant[] }>(undefined, { tenants: [] });
	const loadingRef = createRef<HTMLElement, { loading: boolean }>(undefined, { loading: true });
	const editRef = createRef<HTMLElement, { mode: "create" | "edit"; tenant: Partial<Tenant> | null }>(undefined, {
		mode: "create",
		tenant: null,
	});
	const deleteRef = createRef<HTMLElement, { tenant: Tenant | null }>(undefined, { tenant: null });
	const sortRef = createRef<HTMLElement, { field: string; direction: "asc" | "desc" }>(undefined, {
		field: "name",
		direction: "asc",
	});
	const searchRef = createRef<HTMLElement, { query: string }>(undefined, { query: "" });
	const contentRef = createRef<HTMLDivElement>();
	const formRef = createRef<HTMLFormElement>();
	const tenantDialogRef = createRef<HTMLDialogElement>();
	const deleteDialogRef = createRef<HTMLDialogElement>();

	const openDialog = (dialogRef: { current: HTMLDialogElement | null }) => {
		dialogRef.current?.showModal();
	};

	const closeDialog = (dialogRef: { current: HTMLDialogElement | null }) => {
		dialogRef.current?.close();
	};

	const loadData = async () => {
		try {
			const token = window.$APP_PROPS?.token;
			if (token) setHeaders({ Authorization: `Bearer ${token}` });

			const rpc = await getRpcClient();
			const api = new rpc.TenantsApi();
			const tenants = await api.listTenants();

			tenantsRef.updateState({ tenants });
			loadingRef.updateState({ loading: false });
			$(contentRef).update(renderContent());
		} catch (error) {
			console.error("Failed to load tenants:", error);
			toast({ category: "error", title: t("tenants.toast_load_failed") });
			loadingRef.updateState({ loading: false });
			$(contentRef).update(renderContent());
		}
	};

	const openCreate = () => {
		editRef.updateState({ mode: "create", tenant: { plan: "free" } });
		$(contentRef).update(renderContent());
		openDialog(tenantDialogRef);
	};

	const openEdit = (tenant: Tenant) => {
		editRef.updateState({ mode: "edit", tenant: { ...tenant } });
		$(contentRef).update(renderContent());
		openDialog(tenantDialogRef);
	};

	const saveTenant = async () => {
		const form = await $(formRef).form<{ name: string; slug: string; plan: TenantPlan }>();
		if (!form.name || !form.slug) {
			toast({ category: "warning", title: t("common.missing_required_fields") });
			return;
		}

		try {
			const rpc = await getRpcClient();
			const api = new rpc.TenantsApi();
			if (editRef.state?.mode === "edit" && editRef.state.tenant?.id) {
				await api.updateTenant(editRef.state.tenant.id, form);
				toast({ category: "success", title: t("tenants.toast_updated") });
			} else {
				await api.createTenant(form);
				toast({ category: "success", title: t("tenants.toast_created") });
			}
			closeDialog(tenantDialogRef);
			loadData();
		} catch (error) {
			console.error("Failed to save tenant:", error);
			toast({ category: "error", title: t("tenants.toast_save_failed") });
		}
	};

	const confirmDelete = (tenant: Tenant) => {
		deleteRef.updateState({ tenant });
		$(contentRef).update(renderContent());
		openDialog(deleteDialogRef);
	};

	const doDelete = async () => {
		const tenant = deleteRef.state?.tenant;
		if (!tenant) return;

		try {
			const rpc = await getRpcClient();
			const api = new rpc.TenantsApi();
			await api.deleteTenant(tenant.id);
			toast({ category: "success", title: t("tenants.toast_deleted") });
			closeDialog(deleteDialogRef);
			deleteRef.updateState({ tenant: null });
			loadData();
		} catch (error) {
			console.error("Failed to delete tenant:", error);
			toast({ category: "error", title: t("tenants.toast_delete_failed") });
		}
	};

	const handleSort = (field: string) => {
		const current = sortRef.state || { field: "name", direction: "asc" as const };
		const direction = current.field === field && current.direction === "asc" ? "desc" : "asc";
		sortRef.updateState({ field, direction });
		$(contentRef).update(renderContent());
	};

	const handleSearch = (e: Event) => {
		searchRef.updateState({ query: (e.target as HTMLInputElement).value || "" });
		$(contentRef).update(renderContent());
	};

	const renderContent = () => {
		const loading = loadingRef.state?.loading ?? true;
		const tenants = tenantsRef.state?.tenants || [];
		const current = editRef.state?.tenant || null;

		if (loading) return <DataTableSkeleton columns={5} rows={5} />;

		const query = (searchRef.state?.query || "").trim().toLowerCase();
		const filteredTenants = query
			? tenants.filter((tenant) => {
				return (
					tenant.name.toLowerCase().includes(query) ||
					tenant.slug.toLowerCase().includes(query) ||
					tenant.plan.toLowerCase().includes(query)
				);
			})
			: tenants;

		const currentSort = sortRef.state || { field: "name", direction: "asc" as const };
		const view = createDataview({
			sorters: [{ field: currentSort.field, direction: currentSort.direction }],
		});
		const tenantRows = filteredTenants as unknown as Array<Record<string, unknown>>;
		const entries = applyDataview(tenantRows, view);

		const columns: DataTableColumn[] = [
			{ field: "name", label: t("tenants.col_name"), sortable: true },
			{ field: "slug", label: t("tenants.col_slug"), sortable: true },
			{
				field: "plan",
				label: t("tenants.col_plan"),
				sortable: true,
				render: (value) => {
					const plan = String(value);
					return <Badge variant={plan === "enterprise" ? "default" : "secondary"}>{plan}</Badge>;
				},
			},
			{ field: "userCount", label: t("tenants.col_users"), sortable: true },
			{ field: "apiKeyCount", label: t("tenants.col_api_keys"), sortable: true },
		];

		return (
			<>
				<div className="mb-4">
					<Input
						type="text"
						placeholder={t("tenants.search_placeholder")}
						value={searchRef.state?.query || ""}
						onInput={handleSearch}
					/>
				</div>

				<DataTable
					entries={entries}
					columns={columns}
					sortField={currentSort.field}
					sortDirection={currentSort.direction}
					onSort={handleSort}
					renderActionsHeader={() => (
						<th>
							<div className="flex justify-end select-none">{t("common.actions")}</div>
						</th>
					)}
					renderActions={(entry) => {
						const tenant = entry.row as unknown as Tenant;
						return (
							<>
								<Button variant="outline" size="sm" onClick={() => openEdit(tenant)}>{t("common.edit")}</Button>
								<Button variant="destructive" size="sm" onClick={() => confirmDelete(tenant)}>{t("common.delete")}</Button>
							</>
						);
					}}
				/>

				<Dialog ref={tenantDialogRef} id="tenant-dialog" aria-labelledby="tenant-dialog-title" aria-describedby="tenant-dialog-desc">
					<DialogHeader className="p-4 border-b">
						<DialogTitle id="tenant-dialog-title">{editRef.state?.mode === "edit" ? t("tenants.edit_title") : t("tenants.create_title")}</DialogTitle>
						<DialogDescription id="tenant-dialog-desc">{t("tenants.dialog_description")}</DialogDescription>
					</DialogHeader>
					<DialogContent className="p-4">
						<form ref={formRef} className="form grid gap-3">
							<div className="grid gap-2">
								<Label htmlFor="name">{t("tenants.label_name")}</Label>
								<Input type="text" id="name" name="name" value={current?.name || ""} />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="slug">{t("tenants.label_slug")}</Label>
								<Input type="text" id="slug" name="slug" value={current?.slug || ""} />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="plan">{t("tenants.label_plan")}</Label>
								<Select id="plan" name="plan" value={current?.plan || "free"}>
									<option value="free">{t("tenants.plan_free")}</option>
									<option value="pro">{t("tenants.plan_pro")}</option>
									<option value="enterprise">{t("tenants.plan_enterprise")}</option>
								</Select>
							</div>
						</form>
					</DialogContent>
					<DialogFooter className="p-4 border-t flex justify-end gap-2">
						<Button variant="outline" onClick={() => closeDialog(tenantDialogRef)}>{t("common.cancel")}</Button>
						<Button onClick={saveTenant}>{editRef.state?.mode === "edit" ? t("common.save") : t("common.create")}</Button>
					</DialogFooter>
				</Dialog>

				<AlertDialog
					ref={deleteDialogRef}
					id="delete-tenant-dialog"
					onClick={(e) => {
						if (e.target === e.currentTarget) closeDialog(deleteDialogRef);
					}}
				>
					<AlertDialogContent className="p-4 space-y-4">
						<AlertDialogHeader>
							<AlertDialogTitle>{t("tenants.delete_title")}</AlertDialogTitle>
							<AlertDialogDescription>
								{deleteRef.state?.tenant
									? t("tenants.delete_confirm", { name: deleteRef.state.tenant.name })
									: t("common.are_you_sure")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => closeDialog(deleteDialogRef)}>{t("common.cancel")}</Button>
							<Button variant="destructive" onClick={doDelete}>{t("common.delete")}</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</>
		);
	};

	return (
		<AdminLayout>
			{route && <NavGuard route={route} />}
			<div className="max-w-7xl mx-auto" onMount={() => loadData()}>
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold">{t("tenants.title")}</h1>
						<p className="text-muted-foreground mt-1">{t("tenants.subtitle")}</p>
					</div>
					<Button onClick={openCreate}>{t("tenants.add_tenant")}</Button>
				</div>
				<div ref={contentRef}>{renderContent()}</div>
			</div>
		</AdminLayout>
	);
}

import { createRef, $ } from "defuss";
import { Button, Icon, Badge, Input, Select } from "../../cl";
import { InputLabel, InputField } from "../../cl/forms";
import { DataTable, type Column } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AdminLayout } from "../layouts/admin";
import { createNotification } from "../../cl";
import { getRpcClient, setHeaders } from "defuss-rpc/client.js";
import type { RpcApi } from "../../rpc.js";
import type { Tenant, TenantPlan } from "../../models/tenant.js";

export function TenantsScreen() {
    const tenantsRef = createRef<{ tenants: Tenant[] }>(undefined, { tenants: [] });
    const loadingRef = createRef<{ loading: boolean }>(undefined, { loading: true });
    const modalRef = createRef<{
        open: boolean;
        mode: "create" | "edit";
        tenant: Partial<Tenant> | null;
    }>(undefined, { open: false, mode: "create", tenant: null });
    const deleteRef = createRef<{ open: boolean; tenant: Tenant | null }>(undefined, {
        open: false,
        tenant: null,
    });
    const containerRef = createRef();
    const formRef = createRef();

    const loadData = async () => {
        try {
            const token = window.$APP_PROPS?.token;
            if (token) {
                setHeaders({ Authorization: `Bearer ${token}` });
            }

            const rpc = await getRpcClient<RpcApi>();
            const tenantsApi = new rpc.TenantsApi();
            const tenants = await tenantsApi.listTenants();

            tenantsRef.updateState({ tenants });
            loadingRef.updateState({ loading: false });
            rerender();
        } catch (error) {
            console.error("Failed to load tenants:", error);
            createNotification("Failed to load tenants", "danger");
            loadingRef.updateState({ loading: false });
        }
    };

    const rerender = () => {
        $(containerRef).update(renderContent());
    };

    const openCreateModal = () => {
        modalRef.updateState({
            open: true,
            mode: "create",
            tenant: { plan: "free" },
        });
        rerender();
    };

    const openEditModal = (tenant: Tenant) => {
        modalRef.updateState({ open: true, mode: "edit", tenant: { ...tenant } });
        rerender();
    };

    const closeModal = () => {
        modalRef.updateState({ open: false, mode: "create", tenant: null });
        rerender();
    };

    const handleSaveTenant = async () => {
        const form = await $(formRef).form<{
            name: string;
            slug: string;
            plan: TenantPlan;
        }>();

        if (!form.name || !form.slug) {
            createNotification("Please fill in all required fields", "warning");
            return;
        }

        try {
            const rpc = await getRpcClient<RpcApi>();
            const tenantsApi = new rpc.TenantsApi();

            if (modalRef.state?.mode === "edit" && modalRef.state.tenant?.id) {
                await tenantsApi.updateTenant(modalRef.state.tenant.id, form);
                createNotification("Tenant updated successfully", "success");
            } else {
                await tenantsApi.createTenant(form);
                createNotification("Tenant created successfully", "success");
            }

            closeModal();
            loadData();
        } catch (error) {
            console.error("Failed to save tenant:", error);
            createNotification("Failed to save tenant", "danger");
        }
    };

    const confirmDelete = (tenant: Tenant) => {
        deleteRef.updateState({ open: true, tenant });
        rerender();
    };

    const handleDelete = async () => {
        const tenant = deleteRef.state?.tenant;
        if (!tenant) return;

        try {
            const rpc = await getRpcClient<RpcApi>();
            const tenantsApi = new rpc.TenantsApi();
            await tenantsApi.deleteTenant(tenant.id);
            createNotification("Tenant deleted successfully", "success");
            deleteRef.updateState({ open: false, tenant: null });
            loadData();
        } catch (error) {
            console.error("Failed to delete tenant:", error);
            createNotification("Failed to delete tenant", "danger");
        }
    };

    const getPlanBadgeStyle = (plan: TenantPlan) => {
        switch (plan) {
            case "enterprise":
                return "primary";
            case "pro":
                return "secondary";
            default:
                return undefined;
        }
    };

    const columns: Column<Tenant>[] = [
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        {
            key: "plan",
            label: "Plan",
            render: (tenant) => (
                <Badge styleType={getPlanBadgeStyle(tenant.plan)}>{tenant.plan}</Badge>
            ),
        },
        {
            key: "userCount",
            label: "Users",
            render: (tenant) => (
                <span className="flex items-center gap-1">
                    <Icon icon="users" height={14} width={14} />
                    {tenant.userCount}
                </span>
            ),
        },
        {
            key: "apiKeyCount",
            label: "API Keys",
            render: (tenant) => (
                <span className="flex items-center gap-1">
                    <Icon icon="key" height={14} width={14} />
                    {tenant.apiKeyCount}
                </span>
            ),
        },
        {
            key: "createdAt",
            label: "Created",
            render: (tenant) => (
                <span className="text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const renderModal = () => {
        const { open, mode, tenant } = modalRef.state || {
            open: false,
            mode: "create",
            tenant: null,
        };
        if (!open) return null;

        return (
            <div className="uk-modal uk-open" style="display: block;" tabIndex={-1}>
                <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical max-w-lg">
                    <h3 className="uk-modal-title text-lg font-semibold mb-4">
                        {mode === "edit" ? "Edit Tenant" : "Create Tenant"}
                    </h3>
                    <form ref={formRef} className="space-y-4">
                        <InputField>
                            <InputLabel htmlFor="name" required>
                                Name
                            </InputLabel>
                            <Input
                                id="name"
                                name="name"
                                value={tenant?.name || ""}
                                placeholder="Acme Corporation"
                            />
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="slug" required>
                                Slug
                            </InputLabel>
                            <Input
                                id="slug"
                                name="slug"
                                value={tenant?.slug || ""}
                                placeholder="acme-corp"
                            />
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="plan">Plan</InputLabel>
                            <Select id="plan" name="plan" value={tenant?.plan || "free"}>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </Select>
                        </InputField>
                    </form>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="ghost" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="primary" onClick={handleSaveTenant}>
                            {mode === "edit" ? "Save Changes" : "Create Tenant"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const { tenants } = tenantsRef.state || { tenants: [] };
        const loading = loadingRef.state?.loading ?? true;
        const deleteState = deleteRef.state || { open: false, tenant: null };

        return (
            <>
                <DataTable
                    data={tenants}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchPlaceholder="Search tenants..."
                    emptyMessage="No tenants found"
                    actions={(tenant) => (
                        <div className="flex items-center gap-2">
                            <Button type="ghost" size="sm" onClick={() => openEditModal(tenant)}>
                                <Icon icon="pencil" height={14} width={14} />
                            </Button>
                            <Button type="ghost" size="sm" onClick={() => confirmDelete(tenant)}>
                                <Icon icon="trash-2" height={14} width={14} className="text-destructive" />
                            </Button>
                        </div>
                    )}
                />

                {renderModal()}

                {deleteState.open && deleteState.tenant && (
                    <ConfirmDialog
                        title="Delete Tenant"
                        message={`Are you sure you want to delete "${deleteState.tenant.name}"? This will also delete all associated users and API keys. This action cannot be undone.`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={handleDelete}
                        onCancel={() => {
                            deleteRef.updateState({ open: false, tenant: null });
                            rerender();
                        }}
                    />
                )}
            </>
        );
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto" onMount={() => loadData()}>
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-bold">Tenants</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage organizations and their subscription plans
                        </p>
                    </div>
                    <Button type="primary" onClick={openCreateModal} className="cursor-pointer">
                        <Icon icon="plus" height={16} width={16} className="mr-2" />
                        Add Tenant
                    </Button>
                </div>
                <div ref={containerRef}>{renderContent()}</div>
            </div>
        </AdminLayout>
    );
}

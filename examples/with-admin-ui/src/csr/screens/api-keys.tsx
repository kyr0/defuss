import { createRef, $ } from "defuss";
import { Button, Icon, Badge, Input, Select, Card } from "../../cl";
import { InputLabel, InputField } from "../../cl/forms";
import { DataTable, type Column } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AdminLayout } from "../layouts/admin";
import { createNotification } from "../../cl";
import { getRpcClient, setHeaders } from "defuss-rpc/client.js";
import type { RpcApi } from "../../rpc.js";
import type { ApiKey } from "../../models/api-key.js";
import type { Tenant } from "../../models/tenant.js";

export function ApiKeysScreen() {
    const dataRef = createRef<{ apiKeys: ApiKey[]; tenants: Tenant[] }>(undefined, {
        apiKeys: [],
        tenants: [],
    });
    const loadingRef = createRef<{ loading: boolean }>(undefined, { loading: true });
    const modalRef = createRef<{
        open: boolean;
        newKey: string | null;
    }>(undefined, { open: false, newKey: null });
    const revokeRef = createRef<{ open: boolean; apiKey: ApiKey | null }>(undefined, {
        open: false,
        apiKey: null,
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
            const apiKeysApi = new rpc.ApiKeysApi();
            const tenantsApi = new rpc.TenantsApi();

            const [apiKeys, tenants] = await Promise.all([
                apiKeysApi.listApiKeys(),
                tenantsApi.listTenants(),
            ]);

            dataRef.updateState({ apiKeys, tenants });
            loadingRef.updateState({ loading: false });
            rerender();
        } catch (error) {
            console.error("Failed to load API keys:", error);
            createNotification("Failed to load API keys", "danger");
            loadingRef.updateState({ loading: false });
        }
    };

    const rerender = () => {
        $(containerRef).update(renderContent());
    };

    const openCreateModal = () => {
        modalRef.updateState({ open: true, newKey: null });
        rerender();
    };

    const closeModal = () => {
        modalRef.updateState({ open: false, newKey: null });
        rerender();
    };

    const handleCreateKey = async () => {
        const form = await $(formRef).form<{
            name: string;
            tenantId: string;
        }>();

        if (!form.name || !form.tenantId) {
            createNotification("Please fill in all required fields", "warning");
            return;
        }

        // Get checkbox values directly from DOM
        const formEl = formRef.current as HTMLFormElement;
        const readCheckbox = formEl?.querySelector('input#read[type="checkbox"]') as HTMLInputElement;
        const writeCheckbox = formEl?.querySelector('input#write[type="checkbox"]') as HTMLInputElement;
        const adminCheckbox = formEl?.querySelector('input#admin[type="checkbox"]') as HTMLInputElement;

        const permissions: string[] = [];
        if (readCheckbox?.checked) permissions.push("read");
        if (writeCheckbox?.checked) permissions.push("write");
        if (adminCheckbox?.checked) permissions.push("admin");

        if (permissions.length === 0) {
            createNotification("Please select at least one permission", "warning");
            return;
        }

        try {
            const rpc = await getRpcClient<RpcApi>();
            const apiKeysApi = new rpc.ApiKeysApi();
            const result = await apiKeysApi.createApiKey({
                name: form.name,
                tenantId: form.tenantId,
                permissions,
            });

            createNotification("API key created successfully", "success");
            modalRef.updateState({ open: true, newKey: result.fullKey });
            loadData();
        } catch (error) {
            console.error("Failed to create API key:", error);
            createNotification("Failed to create API key", "danger");
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            createNotification("API key copied to clipboard", "success");
        } catch (error) {
            console.error("Failed to copy:", error);
            createNotification("Failed to copy to clipboard", "warning");
        }
    };

    const confirmRevoke = (apiKey: ApiKey) => {
        revokeRef.updateState({ open: true, apiKey });
        rerender();
    };

    const handleRevoke = async () => {
        const apiKey = revokeRef.state?.apiKey;
        if (!apiKey) return;

        try {
            const rpc = await getRpcClient<RpcApi>();
            const apiKeysApi = new rpc.ApiKeysApi();
            await apiKeysApi.revokeApiKey(apiKey.id);
            createNotification("API key revoked successfully", "success");
            revokeRef.updateState({ open: false, apiKey: null });
            loadData();
        } catch (error) {
            console.error("Failed to revoke API key:", error);
            createNotification("Failed to revoke API key", "danger");
        }
    };

    const getTenantName = (tenantId: string) => {
        return dataRef.state?.tenants.find((t) => t.id === tenantId)?.name || "Unknown";
    };

    const columns: Column<ApiKey>[] = [
        { key: "name", label: "Name" },
        {
            key: "prefix",
            label: "Key",
            render: (apiKey) => (
                <code className="text-sm bg-muted px-2 py-1 rounded">{apiKey.prefix}</code>
            ),
        },
        {
            key: "tenantId",
            label: "Tenant",
            render: (apiKey) => <span>{getTenantName(apiKey.tenantId)}</span>,
        },
        {
            key: "permissions",
            label: "Permissions",
            render: (apiKey) => (
                <div className="flex gap-1 flex-wrap">
                    {apiKey.permissions.map((perm) => (
                        <Badge key={perm} styleType="secondary">
                            {perm}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            key: "lastUsedAt",
            label: "Last Used",
            render: (apiKey) => (
                <span className="text-muted-foreground">
                    {apiKey.lastUsedAt
                        ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                        : "Never"}
                </span>
            ),
        },
        {
            key: "createdAt",
            label: "Created",
            render: (apiKey) => (
                <span className="text-muted-foreground">
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const renderModal = () => {
        const { open, newKey } = modalRef.state || { open: false, newKey: null };
        if (!open) return null;

        // Show the generated key
        if (newKey) {
            return (
                <div className="uk-modal uk-open" style="display: block;" tabIndex={-1}>
                    <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical max-w-lg">
                        <div className="text-center">
                            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                                <Icon icon="check" height={24} width={24} className="text-green-600" />
                            </div>
                            <h3 className="uk-modal-title text-lg font-semibold mb-2">
                                API Key Created
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Make sure to copy your API key now. You won't be able to see it again!
                            </p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg mb-4">
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm break-all">{newKey}</code>
                                <Button
                                    type="secondary"
                                    size="sm"
                                    onClick={() => copyToClipboard(newKey)}
                                >
                                    <Icon icon="copy" height={14} width={14} />
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <Button type="primary" onClick={closeModal}>
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        // Create form
        return (
            <div className="uk-modal uk-open" style="display: block;" tabIndex={-1}>
                <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical max-w-lg">
                    <h3 className="uk-modal-title text-lg font-semibold mb-4">
                        Generate API Key
                    </h3>
                    <form ref={formRef} className="space-y-4">
                        <InputField>
                            <InputLabel htmlFor="name" required>
                                Name
                            </InputLabel>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Production API Key"
                            />
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="tenantId" required>
                                Tenant
                            </InputLabel>
                            <Select id="tenantId" name="tenantId">
                                <option value="">Select a tenant</option>
                                {dataRef.state?.tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </Select>
                        </InputField>
                        <InputField>
                            <InputLabel>Permissions</InputLabel>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="read" className="uk-checkbox" checked />
                                    <span>Read</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="write" className="uk-checkbox" checked />
                                    <span>Write</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="admin" className="uk-checkbox" />
                                    <span>Admin</span>
                                </label>
                            </div>
                        </InputField>
                    </form>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="ghost" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="primary" onClick={handleCreateKey}>
                            Generate Key
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const { apiKeys } = dataRef.state || { apiKeys: [] };
        const loading = loadingRef.state?.loading ?? true;
        const revokeState = revokeRef.state || { open: false, apiKey: null };

        return (
            <>
                <DataTable
                    data={apiKeys}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchPlaceholder="Search API keys..."
                    emptyMessage="No API keys found"
                    actions={(apiKey) => (
                        <Button
                            type="ghost"
                            size="sm"
                            onClick={() => confirmRevoke(apiKey)}
                        >
                            <Icon icon="x" height={14} width={14} className="text-destructive mr-1" />
                            Revoke
                        </Button>
                    )}
                />

                {renderModal()}

                {revokeState.open && revokeState.apiKey && (
                    <ConfirmDialog
                        title="Revoke API Key"
                        message={`Are you sure you want to revoke "${revokeState.apiKey.name}"? Any applications using this key will immediately lose access.`}
                        confirmLabel="Revoke"
                        destructive
                        onConfirm={handleRevoke}
                        onCancel={() => {
                            revokeRef.updateState({ open: false, apiKey: null });
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">API Keys</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage API keys for programmatic access
                        </p>
                    </div>
                    <Button type="primary" onClick={openCreateModal}>
                        <Icon icon="plus" height={16} width={16} className="mr-2" />
                        Generate Key
                    </Button>
                </div>
                <div ref={containerRef}>{renderContent()}</div>
            </div>
        </AdminLayout>
    );
}

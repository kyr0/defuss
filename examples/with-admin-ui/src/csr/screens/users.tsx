import { createRef, $ } from "defuss";
import { Button, Icon, Badge, Input, Select } from "../../cl";
import { InputLabel, InputField } from "../../cl/forms";
import { DataTable, type Column } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AdminLayout } from "../layouts/admin";
import { createNotification } from "../../cl";
import { getRpcClient, setHeaders } from "defuss-rpc/client.js";
import type { RpcApi } from "../../rpc.js";
import type { User, UserRole, UserStatus } from "../../models/user.js";
import type { Tenant } from "../../models/tenant.js";

export function UsersScreen() {
    const usersRef = createRef<{ users: User[]; tenants: Tenant[] }>(undefined, {
        users: [],
        tenants: [],
    });
    const loadingRef = createRef<{ loading: boolean }>(undefined, { loading: true });
    const modalRef = createRef<{
        open: boolean;
        mode: "create" | "edit";
        user: Partial<User> | null;
    }>(undefined, { open: false, mode: "create", user: null });
    const deleteRef = createRef<{ open: boolean; user: User | null }>(undefined, {
        open: false,
        user: null,
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
            const usersApi = new rpc.UsersApi();
            const tenantsApi = new rpc.TenantsApi();

            const [users, tenants] = await Promise.all([
                usersApi.listUsers(),
                tenantsApi.listTenants(),
            ]);

            usersRef.updateState({ users, tenants });
            loadingRef.updateState({ loading: false });
            rerender();
        } catch (error) {
            console.error("Failed to load users:", error);
            createNotification("Failed to load users", "danger");
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
            user: { role: "user", status: "active", tenantId: usersRef.state?.tenants[0]?.id },
        });
        rerender();
    };

    const openEditModal = (user: User) => {
        modalRef.updateState({ open: true, mode: "edit", user: { ...user } });
        rerender();
    };

    const closeModal = () => {
        modalRef.updateState({ open: false, mode: "create", user: null });
        rerender();
    };

    const handleSaveUser = async () => {
        const form = await $(formRef).form<{
            name: string;
            email: string;
            role: UserRole;
            status: UserStatus;
            tenantId: string;
        }>();

        if (!form.name || !form.email) {
            createNotification("Please fill in all required fields", "warning");
            return;
        }

        try {
            const rpc = await getRpcClient<RpcApi>();
            const usersApi = new rpc.UsersApi();

            if (modalRef.state?.mode === "edit" && modalRef.state.user?.uid) {
                await usersApi.updateUser(modalRef.state.user.uid, form);
                createNotification("User updated successfully", "success");
            } else {
                await usersApi.createUser(form);
                createNotification("User created successfully", "success");
            }

            closeModal();
            loadData();
        } catch (error) {
            console.error("Failed to save user:", error);
            createNotification("Failed to save user", "danger");
        }
    };

    const confirmDelete = (user: User) => {
        deleteRef.updateState({ open: true, user });
        rerender();
    };

    const handleDelete = async () => {
        const user = deleteRef.state?.user;
        if (!user) return;

        try {
            const rpc = await getRpcClient<RpcApi>();
            const usersApi = new rpc.UsersApi();
            await usersApi.deleteUser(user.uid);
            createNotification("User deleted successfully", "success");
            deleteRef.updateState({ open: false, user: null });
            loadData();
        } catch (error) {
            console.error("Failed to delete user:", error);
            createNotification("Failed to delete user", "danger");
        }
    };

    const handleToggleStatus = async (user: User) => {
        try {
            const rpc = await getRpcClient<RpcApi>();
            const usersApi = new rpc.UsersApi();
            await usersApi.toggleUserStatus(user.uid);
            createNotification(
                `User ${user.status === "active" ? "suspended" : "activated"}`,
                "success"
            );
            loadData();
        } catch (error) {
            console.error("Failed to toggle user status:", error);
            createNotification("Failed to update user status", "danger");
        }
    };

    const getTenantName = (tenantId: string) => {
        return usersRef.state?.tenants.find((t) => t.id === tenantId)?.name || "Unknown";
    };

    const columns: Column<User>[] = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        {
            key: "role",
            label: "Role",
            render: (user) => (
                <Badge
                    styleType={
                        user.role === "admin"
                            ? "primary"
                            : user.role === "user"
                                ? "secondary"
                                : undefined
                    }
                >
                    {user.role}
                </Badge>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (user) => (
                <Badge
                    styleType={
                        user.status === "active"
                            ? "primary"
                            : user.status === "suspended"
                                ? "destructive"
                                : "secondary"
                    }
                >
                    {user.status}
                </Badge>
            ),
        },
        {
            key: "tenantId",
            label: "Tenant",
            render: (user) => <span>{getTenantName(user.tenantId)}</span>,
        },
    ];

    const renderModal = () => {
        const { open, mode, user } = modalRef.state || { open: false, mode: "create", user: null };
        if (!open) return null;

        return (
            <div className="uk-modal uk-open" style="display: block;" tabIndex={-1}>
                <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical max-w-lg">
                    <h3 className="uk-modal-title text-lg font-semibold mb-4">
                        {mode === "edit" ? "Edit User" : "Create User"}
                    </h3>
                    <form ref={formRef} className="space-y-4">
                        <InputField>
                            <InputLabel htmlFor="name" required>
                                Name
                            </InputLabel>
                            <Input id="name" name="name" value={user?.name || ""} placeholder="John Doe" />
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="email" required>
                                Email
                            </InputLabel>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={user?.email || ""}
                                placeholder="john@example.com"
                            />
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="role">Role</InputLabel>
                            <Select id="role" name="role" value={user?.role || "user"}>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                                <option value="viewer">Viewer</option>
                            </Select>
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="status">Status</InputLabel>
                            <Select id="status" name="status" value={user?.status || "active"}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </Select>
                        </InputField>
                        <InputField>
                            <InputLabel htmlFor="tenantId">Tenant</InputLabel>
                            <Select id="tenantId" name="tenantId" value={user?.tenantId || ""}>
                                {usersRef.state?.tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </Select>
                        </InputField>
                    </form>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="ghost" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="primary" onClick={handleSaveUser}>
                            {mode === "edit" ? "Save Changes" : "Create User"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const { users } = usersRef.state || { users: [] };
        const loading = loadingRef.state?.loading ?? true;
        const deleteState = deleteRef.state || { open: false, user: null };

        return (
            <>
                <DataTable
                    data={users}
                    columns={columns}
                    keyField="uid"
                    loading={loading}
                    searchable
                    searchPlaceholder="Search users..."
                    emptyMessage="No users found"
                    actions={(user) => (
                        <div className="flex items-center gap-2">
                            <Button type="ghost" size="sm" onClick={() => openEditModal(user)}>
                                <Icon icon="pencil" height={14} width={14} />
                            </Button>
                            <Button type="ghost" size="sm" onClick={() => handleToggleStatus(user)}>
                                <Icon
                                    icon={user.status === "active" ? "user-x" : "user-check"}
                                    height={14}
                                    width={14}
                                />
                            </Button>
                            <Button type="ghost" size="sm" onClick={() => confirmDelete(user)}>
                                <Icon icon="trash-2" height={14} width={14} className="text-destructive" />
                            </Button>
                        </div>
                    )}
                />

                {renderModal()}

                {deleteState.open && deleteState.user && (
                    <ConfirmDialog
                        title="Delete User"
                        message={`Are you sure you want to delete "${deleteState.user.name}"? This action cannot be undone.`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={handleDelete}
                        onCancel={() => {
                            deleteRef.updateState({ open: false, user: null });
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
                        <h1 className="text-3xl font-bold">Users</h1>
                        <p className="text-muted-foreground mt-2">Manage users across all tenants</p>
                    </div>
                    <Button type="primary" onClick={openCreateModal} className="cursor-pointer">
                        <Icon icon="plus" height={16} width={16} className="mr-2" />
                        Add User
                    </Button>
                </div>
                <div ref={containerRef}>{renderContent()}</div>
            </div>
        </AdminLayout>
    );
}

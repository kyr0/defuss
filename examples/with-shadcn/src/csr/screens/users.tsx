import { $, createRef } from "defuss";
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
import type { Tenant } from "../../models/tenant.js";
import type { User, UserRole, UserStatus } from "../../models/user.js";
import { AdminLayout } from "../layouts/admin.js";
import { t } from "../i18n";

/**
 * User management screen with searchable data table, create/edit dialog,
 * status toggling, and delete confirmation.
 */
export function UsersScreen() {
  const usersRef = createRef<HTMLElement, { users: User[]; tenants: Tenant[] }>(undefined, { users: [], tenants: [] });
  const loadingRef = createRef<HTMLElement, { loading: boolean }>(undefined, { loading: true });
  const editRef = createRef<HTMLElement, { mode: "create" | "edit"; user: Partial<User> | null }>(undefined, {
    mode: "create",
    user: null,
  });
  const deleteRef = createRef<HTMLElement, { user: User | null }>(undefined, { user: null });
  const sortRef = createRef<HTMLElement, { field: string; direction: "asc" | "desc" }>(undefined, {
    field: "name",
    direction: "asc",
  });
  const searchRef = createRef<HTMLElement, { query: string }>(undefined, { query: "" });
  const contentRef = createRef<HTMLDivElement>();
  const formRef = createRef<HTMLFormElement>();
  const userDialogRef = createRef<HTMLDialogElement>();
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
      const usersApi = new rpc.UsersApi();
      const tenantsApi = new rpc.TenantsApi();
      const [users, tenants] = await Promise.all([usersApi.listUsers(), tenantsApi.listTenants()]);

      usersRef.updateState({ users, tenants });
      loadingRef.updateState({ loading: false });
      $(contentRef).update(renderContent());
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({ category: "error", title: t("users.toast_load_failed") });
      loadingRef.updateState({ loading: false });
      $(contentRef).update(renderContent());
    }
  };

  const openCreate = () => {
    editRef.updateState({
      mode: "create",
      user: { role: "user", status: "active", tenantId: usersRef.state?.tenants[0]?.id },
    });
    $(contentRef).update(renderContent());
    openDialog(userDialogRef);
  };

  const openEdit = (user: User) => {
    editRef.updateState({ mode: "edit", user: { ...user } });
    $(contentRef).update(renderContent());
    openDialog(userDialogRef);
  };

  const saveUser = async () => {
    const form = await $(formRef).form<{
      name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      tenantId: string;
    }>();

    if (!form.name || !form.email || !form.tenantId) {
      toast({ category: "warning", title: t("common.missing_required_fields") });
      return;
    }

    try {
      const rpc = await getRpcClient();
      const api = new rpc.UsersApi();
      if (editRef.state?.mode === "edit" && editRef.state.user?.uid) {
        await api.updateUser(editRef.state.user.uid, form);
        toast({ category: "success", title: t("users.toast_updated") });
      } else {
        await api.createUser(form);
        toast({ category: "success", title: t("users.toast_created") });
      }
      closeDialog(userDialogRef);
      loadData();
    } catch (error) {
      console.error("Failed to save user:", error);
      toast({ category: "error", title: t("users.toast_save_failed") });
    }
  };

  const confirmDelete = (user: User) => {
    deleteRef.updateState({ user });
    $(contentRef).update(renderContent());
    openDialog(deleteDialogRef);
  };

  const doDelete = async () => {
    const user = deleteRef.state?.user;
    if (!user) return;

    try {
      const rpc = await getRpcClient();
      const api = new rpc.UsersApi();
      await api.deleteUser(user.uid);
      toast({ category: "success", title: t("users.toast_deleted") });
      closeDialog(deleteDialogRef);
      deleteRef.updateState({ user: null });
      loadData();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast({ category: "error", title: t("users.toast_delete_failed") });
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const rpc = await getRpcClient();
      const api = new rpc.UsersApi();
      await api.toggleUserStatus(user.uid);
      toast({ category: "success", title: t("users.toast_status_updated") });
      loadData();
    } catch (error) {
      console.error("Failed to toggle status:", error);
      toast({ category: "error", title: t("users.toast_toggle_failed") });
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

  const tenantName = (tenantId: string) =>
    usersRef.state?.tenants.find((tn) => tn.id === tenantId)?.name || t("common.unknown");

  const renderContent = () => {
    const loading = loadingRef.state?.loading ?? true;
    const users = usersRef.state?.users || [];
    const tenants = usersRef.state?.tenants || [];
    const current = editRef.state?.user || null;

    if (loading) return <p className="text-muted-foreground">{t("users.loading")}</p>;

    const query = (searchRef.state?.query || "").trim().toLowerCase();
    const filteredUsers = query
      ? users.filter((user) => {
          const tenant = tenantName(user.tenantId);
          return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query) ||
            user.status.toLowerCase().includes(query) ||
            tenant.toLowerCase().includes(query)
          );
        })
      : users;

    const currentSort = sortRef.state || { field: "name", direction: "asc" as const };
    const view = createDataview({
      sorters: [{ field: currentSort.field, direction: currentSort.direction }],
    });
    const userRows = filteredUsers as unknown as Array<Record<string, unknown>>;
    const entries = applyDataview(userRows, view);

    const columns: DataTableColumn[] = [
      { field: "name", label: t("users.col_name"), sortable: true },
      { field: "email", label: t("users.col_email"), sortable: true },
      {
        field: "role",
        label: t("users.col_role"),
        sortable: true,
        render: (value) => {
          const role = String(value);
          return <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>;
        },
      },
      {
        field: "status",
        label: t("users.col_status"),
        sortable: true,
        render: (value) => {
          const status = String(value);
          return (
            <Badge variant={status === "active" ? "default" : status === "suspended" ? "destructive" : "secondary"}>
              {status}
            </Badge>
          );
        },
      },
      {
        field: "tenantId",
        label: t("users.col_tenant"),
        sortable: true,
        render: (value) => <span>{tenantName(String(value))}</span>,
      },
    ];

    return (
      <>
        <div className="mb-4">
          <Input
            type="text"
            placeholder={t("users.search_placeholder")}
            value={searchRef.state?.query || ""}
            onInput={handleSearch}
          />
        </div>

        <DataTable
          entries={entries}
          columns={columns}
          idField="uid"
          sortField={currentSort.field}
          sortDirection={currentSort.direction}
          onSort={handleSort}
          renderActions={(entry) => {
            const user = entry.row as unknown as User;
            return (
              <>
                <Button variant="outline" size="sm" onClick={() => openEdit(user)}>{t("common.edit")}</Button>
                <Button variant="secondary" size="sm" onClick={() => toggleStatus(user)}>{t("users.toggle_status")}</Button>
                <Button variant="destructive" size="sm" onClick={() => confirmDelete(user)}>{t("common.delete")}</Button>
              </>
            );
          }}
        />

        <Dialog ref={userDialogRef} id="user-dialog" aria-labelledby="user-dialog-title" aria-describedby="user-dialog-desc">
          <DialogHeader className="p-4 border-b">
            <DialogTitle id="user-dialog-title">{editRef.state?.mode === "edit" ? t("users.edit_title") : t("users.create_title")}</DialogTitle>
            <DialogDescription id="user-dialog-desc">{t("users.dialog_description")}</DialogDescription>
          </DialogHeader>
          <DialogContent className="p-4">
            <form ref={formRef} className="form grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("users.label_name")}</Label>
                <Input type="text" id="name" name="name" value={current?.name || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("users.label_email")}</Label>
                <Input id="email" name="email" type="email" value={current?.email || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t("users.label_role")}</Label>
                <Select id="role" name="role" value={current?.role || "user"}>
                  <option value="admin">{t("users.role_admin")}</option>
                  <option value="user">{t("users.role_user")}</option>
                  <option value="viewer">{t("users.role_viewer")}</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">{t("users.label_status")}</Label>
                <Select id="status" name="status" value={current?.status || "active"}>
                  <option value="active">{t("users.status_active")}</option>
                  <option value="inactive">{t("users.status_inactive")}</option>
                  <option value="suspended">{t("users.status_suspended")}</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantId">{t("users.label_tenant")}</Label>
                <Select id="tenantId" name="tenantId" value={current?.tenantId || ""}>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </Select>
              </div>
            </form>
          </DialogContent>
          <DialogFooter className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeDialog(userDialogRef)}>{t("common.cancel")}</Button>
            <Button onClick={saveUser}>{editRef.state?.mode === "edit" ? t("common.save") : t("common.create")}</Button>
          </DialogFooter>
        </Dialog>

        <AlertDialog
          ref={deleteDialogRef}
          id="delete-user-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog(deleteDialogRef);
          }}
        >
          <AlertDialogContent className="p-4 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("users.delete_title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRef.state?.user
                  ? t("users.delete_confirm", { name: deleteRef.state.user.name })
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
      <div className="max-w-7xl mx-auto" onMount={() => loadData()}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("users.subtitle")}</p>
          </div>
          <Button onClick={openCreate}>{t("users.add_user")}</Button>
        </div>
        <div ref={contentRef}>{renderContent()}</div>
      </div>
    </AdminLayout>
  );
}

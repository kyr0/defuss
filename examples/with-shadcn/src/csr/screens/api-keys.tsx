import { $, createRef } from "defuss";
import { createDataview, applyDataview } from "defuss-dataview";
import { setHeaders } from "defuss-rpc/client.js";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  Checkbox,
  Input,
  Label,
  Select,
  DataTable,
  type DataTableColumn,
  toast,
} from "defuss-shadcn";
import { getRpcClient } from "../lib/rpc-client";
import type { ApiKey } from "../../models/api-key.js";
import type { Tenant } from "../../models/tenant.js";
import { AdminLayout } from "../layouts/admin.js";
import { DataTableSkeleton } from "../components/data-table-skeleton";
import { t } from "../i18n";

/**
 * API key management screen with searchable data table,
 * key generation dialog, and revoke confirmation.
 */
export function ApiKeysScreen() {
  const dataRef = createRef<HTMLElement, { apiKeys: ApiKey[]; tenants: Tenant[] }>(undefined, { apiKeys: [], tenants: [] });
  const loadingRef = createRef<HTMLElement, { loading: boolean }>(undefined, { loading: true });
  const createStateRef = createRef<HTMLElement, { fullKey: string | null }>(undefined, { fullKey: null });
  const deleteRef = createRef<HTMLElement, { apiKey: ApiKey | null }>(undefined, { apiKey: null });
  const sortRef = createRef<HTMLElement, { field: string; direction: "asc" | "desc" }>(undefined, {
    field: "name",
    direction: "asc",
  });
  const searchRef = createRef<HTMLElement, { query: string }>(undefined, { query: "" });
  const contentRef = createRef<HTMLDivElement>();
  const formRef = createRef<HTMLFormElement>();
  const apiKeyDialogRef = createRef<HTMLDialogElement>();
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
      const apiKeysApi = new rpc.ApiKeysApi();
      const tenantsApi = new rpc.TenantsApi();
      const [apiKeys, tenants] = await Promise.all([apiKeysApi.listApiKeys(), tenantsApi.listTenants()]);

      dataRef.updateState({ apiKeys, tenants });
      loadingRef.updateState({ loading: false });
      $(contentRef).update(renderContent());
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast({ category: "error", title: t("apiKeys.toast_load_failed") });
      loadingRef.updateState({ loading: false });
      $(contentRef).update(renderContent());
    }
  };

  const openCreate = () => {
    createStateRef.updateState({ fullKey: null });
    $(contentRef).update(renderContent());
    openDialog(apiKeyDialogRef);
  };

  const createKey = async () => {
    const form = await $(formRef).form<{ name: string; tenantId: string }>();
    if (!form.name || !form.tenantId) {
      toast({ category: "warning", title: t("common.missing_required_fields") });
      return;
    }

    const formEl = formRef.current as HTMLFormElement;
    const permissions: string[] = [];
    if ((formEl.querySelector("#read") as HTMLInputElement)?.checked) permissions.push("read");
    if ((formEl.querySelector("#write") as HTMLInputElement)?.checked) permissions.push("write");
    if ((formEl.querySelector("#admin") as HTMLInputElement)?.checked) permissions.push("admin");

    if (permissions.length === 0) {
      toast({ category: "warning", title: t("apiKeys.select_permission_warning") });
      return;
    }

    try {
      const rpc = await getRpcClient();
      const api = new rpc.ApiKeysApi();
      const result = await api.createApiKey({
        name: form.name,
        tenantId: form.tenantId,
        permissions,
      });
      createStateRef.updateState({ fullKey: result.fullKey });
      $(contentRef).update(renderContent());
      toast({ category: "success", title: t("apiKeys.toast_created") });
      loadData();
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast({ category: "error", title: t("apiKeys.toast_create_failed") });
    }
  };

  const confirmRevoke = (apiKey: ApiKey) => {
    deleteRef.updateState({ apiKey });
    $(contentRef).update(renderContent());
    openDialog(deleteDialogRef);
  };

  const revokeKey = async () => {
    const apiKey = deleteRef.state?.apiKey;
    if (!apiKey) return;

    try {
      const rpc = await getRpcClient();
      const api = new rpc.ApiKeysApi();
      await api.revokeApiKey(apiKey.id);
      toast({ category: "success", title: t("apiKeys.toast_revoked") });
      closeDialog(deleteDialogRef);
      deleteRef.updateState({ apiKey: null });
      loadData();
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      toast({ category: "error", title: t("apiKeys.toast_revoke_failed") });
    }
  };

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ category: "success", title: t("apiKeys.toast_copied") });
    } catch (error) {
      console.error("Clipboard error:", error);
      toast({ category: "error", title: t("apiKeys.toast_copy_failed") });
    }
  };

  const tenantName = (tenantId: string) =>
    dataRef.state?.tenants.find((tn) => tn.id === tenantId)?.name || t("common.unknown");

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
    const apiKeys = dataRef.state?.apiKeys || [];
    const tenants = dataRef.state?.tenants || [];
    const fullKey = createStateRef.state?.fullKey;

    if (loading) return <DataTableSkeleton columns={5} rows={5} />;

    const query = (searchRef.state?.query || "").trim().toLowerCase();
    const filteredApiKeys = query
      ? apiKeys.filter((key) => {
          const tenant = tenantName(key.tenantId);
          const perms = key.permissions.join(" ");
          return (
            key.name.toLowerCase().includes(query) ||
            key.prefix.toLowerCase().includes(query) ||
            tenant.toLowerCase().includes(query) ||
            perms.toLowerCase().includes(query)
          );
        })
      : apiKeys;

    const currentSort = sortRef.state || { field: "name", direction: "asc" as const };
    const view = createDataview({
      sorters: [{ field: currentSort.field, direction: currentSort.direction }],
    });
    const apiKeyRows = filteredApiKeys as unknown as Array<Record<string, unknown>>;
    const entries = applyDataview(apiKeyRows, view);

    const columns: DataTableColumn[] = [
      { field: "name", label: t("apiKeys.col_name"), sortable: true },
      {
        field: "prefix",
        label: t("apiKeys.col_key"),
        sortable: true,
        render: (value) => <code>{String(value)}</code>,
      },
      {
        field: "tenantId",
        label: t("apiKeys.col_tenant"),
        sortable: true,
        render: (value) => <span>{tenantName(String(value))}</span>,
      },
      {
        field: "permissions",
        label: t("apiKeys.col_permissions"),
        render: (value, entry) => {
          const key = entry.row as unknown as ApiKey;
          const perms = (value as string[]) || [];
          return (
            <span className="space-x-1">
              {perms.map((perm) => (
                <Badge key={`${key.id}-${perm}`} variant="secondary">{perm}</Badge>
              ))}
            </span>
          );
        },
      },
      {
        field: "createdAt",
        label: t("apiKeys.col_created"),
        sortable: true,
        render: (value) => <span>{new Date(String(value)).toLocaleDateString()}</span>,
      },
    ];

    return (
      <>
        <div className="mb-4">
          <Input
            type="text"
            placeholder={t("apiKeys.search_placeholder")}
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
            const apiKey = entry.row as unknown as ApiKey;
            return <Button variant="destructive" size="sm" onClick={() => confirmRevoke(apiKey)}>{t("apiKeys.revoke")}</Button>;
          }}
        />

        <Dialog ref={apiKeyDialogRef} id="api-key-dialog" aria-labelledby="api-key-dialog-title" aria-describedby="api-key-dialog-desc">
          <DialogHeader className="p-4 border-b">
            <DialogTitle id="api-key-dialog-title">{t("apiKeys.create_title")}</DialogTitle>
            <DialogDescription id="api-key-dialog-desc">{t("apiKeys.create_description")}</DialogDescription>
          </DialogHeader>
          <DialogContent className="p-4">
            {fullKey ? (
              <Alert>
                <AlertTitle>{t("apiKeys.key_created_title")}</AlertTitle>
                <AlertDescription>
                  {t("apiKeys.key_created_warning")}
                  <div className="mt-2 flex gap-2 items-center">
                    <code className="text-xs break-all">{fullKey}</code>
                    <Button variant="outline" size="sm" onClick={() => copyKey(fullKey)}>{t("common.copy")}</Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <form ref={formRef} className="form grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("apiKeys.label_name")}</Label>
                  <Input type="text" id="name" name="name" placeholder={t("apiKeys.name_placeholder")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenantId">{t("apiKeys.label_tenant")}</Label>
                  <Select id="tenantId" name="tenantId">
                    <option value="">{t("apiKeys.select_tenant")}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </Select>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="text-sm">{t("apiKeys.label_permissions")}</legend>
                  <Label className="flex items-center gap-2 font-normal" htmlFor="read">
                    <Checkbox id="read" checked /> {t("apiKeys.perm_read")}
                  </Label>
                  <Label className="flex items-center gap-2 font-normal" htmlFor="write">
                    <Checkbox id="write" checked /> {t("apiKeys.perm_write")}
                  </Label>
                  <Label className="flex items-center gap-2 font-normal" htmlFor="admin">
                    <Checkbox id="admin" /> {t("apiKeys.perm_admin")}
                  </Label>
                </fieldset>
              </form>
            )}
          </DialogContent>
          <DialogFooter className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeDialog(apiKeyDialogRef)}>{t("common.close")}</Button>
            {!fullKey && <Button onClick={createKey}>{t("apiKeys.generate_key")}</Button>}
          </DialogFooter>
        </Dialog>

        <AlertDialog
          ref={deleteDialogRef}
          id="delete-key-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog(deleteDialogRef);
          }}
        >
          <AlertDialogContent className="p-4 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("apiKeys.revoke_title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRef.state?.apiKey
                  ? t("apiKeys.revoke_confirm", { name: deleteRef.state.apiKey.name })
                  : t("common.are_you_sure")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeDialog(deleteDialogRef)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={revokeKey}>{t("apiKeys.revoke")}</Button>
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
            <h1 className="text-3xl font-bold">{t("apiKeys.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("apiKeys.subtitle")}</p>
          </div>
          <Button onClick={openCreate}>{t("apiKeys.generate_key")}</Button>
        </div>
        <div ref={contentRef}>{renderContent()}</div>
      </div>
    </AdminLayout>
  );
}

import React, {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  FilePlus2,
  LayoutDashboard,
  Loader2,
  Menu,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  X,
} from "lucide-react";
import {
  bootstrap,
  createRecord,
  dashboard,
  getRecord,
  listModule,
  updateRecord,
  type ApiResponse,
} from "./api";

type ModuleMeta = {
  key: string;
  titleKh: string;
  titleEn: string;
  sheet: string;
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
    computed?: boolean;
    readonly?: boolean;
    relation?: string;
    dependsOn?: string;
    options?: string[];
    kh?: string;
    en?: string;
  }>;
};

type Capabilities = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type BootData = {
  user: {
    email: string;
    name: string;
    role: string;
    authorized: boolean;
  };
  modules: Record<string, ModuleMeta>;
  capabilities: Record<string, Capabilities>;
  refs: Record<string, Array<Record<string, unknown>>>;
};

const MODULE_ORDER = [
  "projects",
  "plan",
  "budget",
  "bidding",
  "suppliers",
  "bids",
  "evaluations",
  "contracts",
  "payments",
  "variations",
  "deliveries",
  "handover",
  "warranty",
  "defects",
  "documents",
] as const;

const MODULE_GROUPS = [
  {
    title: "Procurement",
    items: ["projects", "plan", "budget", "bidding", "suppliers", "bids", "evaluations"],
  },
  {
    title: "Contract Management",
    items: ["contracts", "payments", "variations", "deliveries", "handover", "warranty", "defects"],
  },
  {
    title: "System",
    items: ["documents"],
  },
];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function humanTitle(module: string, meta?: ModuleMeta) {
  return meta?.titleEn || module;
}

function isTextLike(type: string) {
  return ["text", "textarea", "date"].includes(type);
}

function App() {
  const [boot, setBoot] = useState<BootData | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [activeModule, setActiveModule] = useState("projects");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeMeta = boot?.modules?.[activeModule];
  const capability = boot?.capabilities?.[activeModule];

  async function loadBootstrap() {
    setBooting(true);
    setBootError("");
    try {
      const result = await bootstrap();
      if (!result.success || !result.data) {
        throw new Error(result.message || "Unable to load system.");
      }
      setBoot(result.data);
      setActiveModule(
        MODULE_ORDER.find(
          (name) => result.data?.capabilities?.[name]?.view
        ) || "projects"
      );
    } catch (error) {
      setBootError(error instanceof Error ? error.message : "Unable to load system.");
    } finally {
      setBooting(false);
    }
  }

  async function loadModule(module = activeModule, requestedPage = page, requestedQuery = query) {
    setLoading(true);
    setMessage("");
    try {
      const result = await listModule(module, {
        page: requestedPage,
        pageSize: 25,
        q: requestedQuery,
      });
      if (!result.success || !result.data) {
        throw new Error(result.message || "Unable to load data.");
      }
      setRows(result.data.rows || []);
      setHasMore(Boolean(result.data.hasMore));
      setPage(result.data.page || requestedPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    try {
      const result = await dashboard();
      if (result.success && result.data) {
        setDashboardData(result.data);
      }
    } catch {
      setDashboardData(null);
    }
  }

  useEffect(() => {
    void loadBootstrap();
  }, []);

  useEffect(() => {
    if (!boot || activeModule === "dashboard") return;
    if (!capability?.view) return;
    const timer = window.setTimeout(() => {
      void loadModule(activeModule, 1, query);
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [boot, activeModule, query]);

  useEffect(() => {
    if (boot) void loadDashboard();
  }, [boot]);

  const visibleFields = useMemo(
    () =>
      (activeMeta?.fields || []).filter(
        (field) => !field.computed || field.name === activeMeta?.key
      ),
    [activeMeta]
  );

  function changeModule(module: string) {
    setActiveModule(module);
    setQuery("");
    setPage(1);
    setRows([]);
    setSidebarOpen(false);
    setShowForm(false);
  }

  function openCreate() {
    setEditingId("");
    const initial: Record<string, unknown> = {};
    for (const field of activeMeta?.fields || []) {
      if (!field.computed && !field.readonly) {
        initial[field.name] = "";
      }
    }
    setForm(initial);
    setShowForm(true);
  }

  async function openEdit(id: string) {
    setFormLoading(true);
    setMessage("");
    try {
      const result = await getRecord(activeModule, id);
      if (!result.success || !result.data) {
        throw new Error(result.message || "Unable to load record.");
      }
      setEditingId(id);
      setForm(result.data);
      setShowForm(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load record.");
    } finally {
      setFormLoading(false);
    }
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    if (!activeMeta) return;

    setFormLoading(true);
    setMessage("");

    try {
      let result: ApiResponse;
      if (editingId) {
        result = await updateRecord(activeModule, editingId, form);
      } else {
        result = await createRecord(activeModule, form);
      }

      if (!result.success) {
        throw new Error(result.message || "Save failed.");
      }

      setShowForm(false);
      setMessage(result.message || (editingId ? "Updated successfully." : "Created successfully."));
      await loadModule(activeModule, 1, query);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setFormLoading(false);
    }
  }

  async function refresh() {
    await loadModule(activeModule, page, query);
    await loadDashboard();
  }

  const kpis = (dashboardData?.kpis || {}) as Record<string, unknown>;

  if (booting) {
    return (
      <div className="blue-screen">
        <div className="blue-card">
          <div className="brand-badge">
            <Database size={22} />
          </div>
          <div className="spinner-large"><Loader2 size={36} /></div>
          <h1>កំពុងរៀបចំប្រព័ន្ធ</h1>
          <p>Initializing Government Procurement System...</p>
          <div className="progress-track"><div className="progress-bar" /></div>
          <span>Loading authentication, permissions and modules</span>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="blue-screen">
        <div className="blue-card error-card">
          <CircleAlert size={38} />
          <h1>System unavailable</h1>
          <p>{bootError}</p>
          <button className="btn primary" onClick={() => void loadBootstrap()}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div>
            <strong>Procurement CMS</strong>
            <small>Government Procurement & Contract Management</small>
          </div>
        </div>

        <button className={`nav-item ${activeModule === "dashboard" ? "active" : ""}`} onClick={() => changeModule("dashboard")}>
          <LayoutDashboard size={16} /> Dashboard
        </button>

        {MODULE_GROUPS.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-title">{group.title}</div>
            {group.items.map((module) => {
              const meta = boot?.modules?.[module];
              const cap = boot?.capabilities?.[module];
              if (!meta || !cap?.view) return null;
              return (
                <button
                  key={module}
                  className={`nav-item ${activeModule === module ? "active" : ""}`}
                  onClick={() => changeModule(module)}
                >
                  <Table2 size={15} />
                  <span>{humanTitle(module, meta)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {sidebarOpen && <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setSidebarOpen((v) => !v)}>
            <Menu size={19} />
          </button>

          <div className="top-title">
            <strong>{activeModule === "dashboard" ? "Dashboard" : humanTitle(activeModule, activeMeta)}</strong>
            <span>{boot?.user?.role || "Viewer"}</span>
          </div>

          <div className="top-actions">
            {activeModule !== "dashboard" && (
              <div className="searchbox">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                />
              </div>
            )}
            <div className="user-chip">
              <div className="avatar">{(boot?.user?.name || "U").slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{boot?.user?.name || "User"}</strong>
                <small>{boot?.user?.email || ""}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {activeModule === "dashboard" ? (
            <DashboardView kpis={kpis} dashboardData={dashboardData} />
          ) : (
            <>
              <div className="page-head">
                <div>
                  <h1>{activeMeta?.titleEn || activeModule}</h1>
                  <p>{activeMeta?.titleKh || ""}</p>
                </div>
                <div className="toolbar">
                  <button className="btn secondary" onClick={() => void refresh()} disabled={loading}>
                    <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
                  </button>
                  {capability?.create && (
                    <button className="btn primary" onClick={openCreate}>
                      <FilePlus2 size={15} /> Create
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <div className={`notice ${message.toLowerCase().includes("success") ? "success" : "error"}`}>
                  <span>{message}</span>
                  <button className="icon-btn" onClick={() => setMessage("")}><X size={14} /></button>
                </div>
              )}

              <div className="card table-card">
                {loading ? (
                  <TableSkeleton />
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            {(activeMeta?.fields || []).slice(0, 6).map((field) => (
                              <th key={field.name}>{field.en || field.name}</th>
                            ))}
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="empty">No records found.</td>
                            </tr>
                          ) : (
                            rows.map((row) => (
                              <tr key={String(row[activeMeta?.key || "ID"] || Math.random())}>
                                <td className="mono">{formatValue(row[activeMeta?.key || "ID"])}</td>
                                {(activeMeta?.fields || []).slice(0, 6).map((field) => (
                                  <td key={field.name}>{formatValue(row[field.name])}</td>
                                ))}
                                <td>
                                  {capability?.edit && (
                                    <button
                                      className="icon-btn"
                                      title="Edit"
                                      onClick={() => void openEdit(String(row[activeMeta.key]))}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="pagination">
                      <button
                        className="btn secondary tiny"
                        disabled={page <= 1 || loading}
                        onClick={() => void loadModule(activeModule, page - 1, query)}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <span>Page {page}</span>
                      <button
                        className="btn secondary tiny"
                        disabled={!hasMore || loading}
                        onClick={() => void loadModule(activeModule, page + 1, query)}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showForm && activeMeta && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <strong>{editingId ? "Update Record" : "Create Record"}</strong>
                <small>{activeMeta.titleKh}</small>
              </div>
              <button className="icon-btn" disabled={formLoading} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm}>
              <div className="modal-body">
                <div className="form-grid">
                  {activeMeta.fields
                    .filter((field) => !field.computed && !field.readonly)
                    .map((field) => (
                      <FormField
                        key={field.name}
                        field={field}
                        value={form[field.name]}
                        onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
                      />
                    ))}
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn secondary" disabled={formLoading} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={formLoading}>
                  {formLoading ? <><Loader2 size={15} className="spin" /> {editingId ? "Updating..." : "Creating..."}</> : editingId ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>

            {formLoading && (
              <div className="modal-busy">
                <Loader2 size={26} className="spin" />
                <strong>{editingId ? "Updating data..." : "Creating data..."}</strong>
                <span>Validating → Saving → Refreshing</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({
  kpis,
  dashboardData,
}: {
  kpis: Record<string, unknown>;
  dashboardData: Record<string, unknown> | null;
}) {
  const cards = [
    ["Total Projects", kpis.projects],
    ["Procurement Plans", kpis.plans],
    ["Total Budget", kpis.totalBudget],
    ["Approved Budget", kpis.approvedBudget],
    ["Contracts", kpis.contracts],
    ["Current Contract Value", kpis.currentContractValue],
    ["Total Paid", kpis.totalPaid],
    ["Remaining Balance", kpis.remainingBalance],
    ["Expiring Warranty", kpis.expiringWarranty],
    ["Expired Warranty", kpis.expiredWarranty],
    ["Open Defects", kpis.openDefects],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Government Procurement & Contract Management System</p>
        </div>
        <BarChart3 size={28} className="muted-icon" />
      </div>

      <div className="kpi-grid">
        {cards.map(([label, value]) => (
          <div className="card kpi" key={label as string}>
            <span>{label}</span>
            <strong>{value ?? "0"}</strong>
          </div>
        ))}
      </div>

      <div className="card pipeline-card">
        <div className="card-title">
          <strong>8-Stage Procurement Lifecycle</strong>
          <span>Planning → Warranty</span>
        </div>
        <div className="pipeline">
          {((dashboardData?.pipeline || []) as Array<Record<string, unknown>>).map((item) => (
            <div className="pipeline-stage" key={String(item.stage)}>
              <span>{String(item.stage)}</span>
              <strong>{String(item.count ?? 0)}</strong>
              <div className="stage-bar">
                <i style={{ width: `${Math.min(100, Number(item.percentage || 0))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="skeleton-wrap">
      {[0, 1, 2, 3, 4, 5, 6].map((row) => (
        <div className="skeleton-row" key={row}>
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
            <div className="skeleton-cell" key={cell} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: ModuleMeta["fields"][number];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.en || field.name;
  const kh = field.kh || "";

  if (field.type === "select") {
    return (
      <label className="form-field">
        <span>{label} {field.required ? "*" : ""}</span>
        <small>{kh}</small>
        <select
          value={String(value ?? "")}
          required={Boolean(field.required)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  const inputType = field.type === "date" ? "date" : field.type === "number" ? "number" : "text";

  return (
    <label className={`form-field ${field.type === "textarea" ? "full" : ""}`}>
      <span>{label} {field.required ? "*" : ""}</span>
      <small>{kh}</small>
      {field.type === "textarea" ? (
        <textarea
          value={String(value ?? "")}
          required={Boolean(field.required)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={inputType}
          value={String(value ?? "")}
          required={Boolean(field.required)}
          onChange={(event) =>
            onChange(
              field.type === "number"
                ? event.target.value
                : event.target.value
            )
          }
        />
      )}
    </label>
  );
}

export default App;
